import { cache } from "react";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { trustScore } from "@/lib/ranking";

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export const getTaxonomy = cache(async () => {
  const [subjects, districts, grades, languages] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.district.findMany({ orderBy: { name: "asc" } }),
    db.grade.findMany({ orderBy: { order: "asc" } }),
    db.language.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { subjects, districts, grades, languages };
});

export const getPlatformStats = cache(async () => {
  const [teacherCount, verifiedCount, reviewCount, districtCount, studentCount] =
    await Promise.all([
      db.teacherProfile.count({ where: { consentPublic: true, user: { status: "active" } } }),
      db.teacherProfile.count({ where: { verifiedStatus: "verified", consentPublic: true } }),
      db.review.count({ where: { status: "published" } }),
      db.district.count(),
      db.user.count({ where: { role: "student", status: "active" } }),
    ]);
  return { teacherCount, verifiedCount, reviewCount, districtCount, studentCount };
});

export const getSubjectCounts = cache(async () => {
  const rows = await db.teacherSubject.groupBy({
    by: ["subjectId"],
    _count: { _all: true },
  });
  const subjects = await db.subject.findMany({ orderBy: { name: "asc" } });
  const countById = new Map(rows.map((r) => [r.subjectId, r._count._all]));
  return subjects.map((s) => ({ ...s, teacherCount: countById.get(s.id) ?? 0 }));
});

// ---------------------------------------------------------------------------
// Teacher cards (Explore / Home)
// ---------------------------------------------------------------------------

export type TeacherCard = {
  profileId: string;
  userId: string;
  handle: string;
  name: string;
  avatarId: string | null;
  verified: boolean;
  tagline: string | null;
  mode: string;
  experienceYears: number | null;
  createdAt: Date;
  subjects: { slug: string; name: string; nameSi: string | null }[];
  districts: { slug: string; name: string; nameSi: string | null }[];
  grades: { slug: string; name: string }[];
  languages: string[];
  avgStars: number | null;
  reviewCount: number;
  followerCount: number;
  postCount: number;
  trust: number;
};

export type TeacherFilters = {
  q?: string;
  subject?: string;
  district?: string;
  grade?: string;
  language?: string;
  mode?: string;
  verifiedOnly?: boolean;
  sort?: "trust" | "rating" | "reviews" | "new";
  limit?: number;
  offset?: number;
};

const TEACHER_SELECT = {
  id: true,
  userId: true,
  handle: true,
  tagline: true,
  mode: true,
  experienceYears: true,
  createdAt: true,
  verifiedStatus: true,
  user: { select: { name: true, avatarKey: true } },
  subjects: { select: { subject: { select: { slug: true, name: true, nameSi: true } } } },
  districts: { select: { district: { select: { slug: true, name: true, nameSi: true } } } },
  grades: { select: { grade: { select: { slug: true, name: true } } } },
  languages: { select: { language: { select: { name: true } } } },
} satisfies Prisma.TeacherProfileSelect;

export async function getTeacherCards(filters: TeacherFilters = {}): Promise<{
  teachers: TeacherCard[];
  total: number;
}> {
  const where: Prisma.TeacherProfileWhereInput = {
    consentPublic: true,
    user: { status: "active" },
  };

  if (filters.verifiedOnly) where.verifiedStatus = "verified";
  if (filters.mode && ["physical", "online", "both"].includes(filters.mode)) {
    where.mode = filters.mode;
  }
  if (filters.subject) where.subjects = { some: { subject: { slug: filters.subject } } };
  if (filters.district) where.districts = { some: { district: { slug: filters.district } } };
  if (filters.grade) where.grades = { some: { grade: { slug: filters.grade } } };
  if (filters.language) where.languages = { some: { language: { slug: filters.language } } };

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { handle: { contains: q } },
      { tagline: { contains: q } },
      { bio: { contains: q } },
      { user: { name: { contains: q } } },
      { subjects: { some: { subject: { name: { contains: q } } } } },
      { subjects: { some: { subject: { nameSi: { contains: q } } } } },
    ];
  }

  const profiles = await db.teacherProfile.findMany({
    where,
    select: TEACHER_SELECT,
    take: 300,
  });

  const userIds = profiles.map((p) => p.userId);
  if (userIds.length === 0) return { teachers: [], total: 0 };

  const [reviewAggs, followAggs, postAggs] = await Promise.all([
    db.review.groupBy({
      by: ["teacherId"],
      where: { teacherId: { in: userIds }, status: "published" },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    db.follow.groupBy({
      by: ["teacherId"],
      where: { teacherId: { in: userIds } },
      _count: { _all: true },
    }),
    db.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: userIds }, moderationStatus: "approved" },
      _count: { _all: true },
      _max: { publishedAt: true },
    }),
  ]);

  const reviewById = new Map(reviewAggs.map((r) => [r.teacherId, r]));
  const followById = new Map(followAggs.map((f) => [f.teacherId, f._count._all]));
  const postById = new Map(postAggs.map((p) => [p.authorId, p]));

  const teachers: TeacherCard[] = profiles.map((p) => {
    const agg = reviewById.get(p.userId);
    const avgStars = agg?._avg.stars ?? null;
    const reviewCount = agg?._count._all ?? 0;
    const postAgg = postById.get(p.userId);
    return {
      profileId: p.id,
      userId: p.userId,
      handle: p.handle,
      name: p.user.name,
      avatarId: p.user.avatarKey,
      verified: p.verifiedStatus === "verified",
      tagline: p.tagline,
      mode: p.mode,
      experienceYears: p.experienceYears,
      createdAt: p.createdAt,
      subjects: p.subjects.map((s) => s.subject),
      districts: p.districts.map((d) => d.district),
      grades: p.grades.map((g) => g.grade),
      languages: p.languages.map((l) => l.language.name),
      avgStars,
      reviewCount,
      followerCount: followById.get(p.userId) ?? 0,
      postCount: postAgg?._count._all ?? 0,
      trust: trustScore({
        avgStars,
        reviewCount,
        lastActivityAt: postAgg?._max.publishedAt ?? null,
      }),
    };
  });

  const sort = filters.sort ?? "trust";
  teachers.sort((a, b) => {
    if (sort === "rating") return (b.avgStars ?? 0) - (a.avgStars ?? 0) || b.reviewCount - a.reviewCount;
    if (sort === "reviews") return b.reviewCount - a.reviewCount;
    if (sort === "new") return b.createdAt.getTime() - a.createdAt.getTime();
    return b.trust - a.trust;
  });

  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 24;
  return { teachers: teachers.slice(offset, offset + limit), total: teachers.length };
}

// ---------------------------------------------------------------------------
// Posts hydration
// ---------------------------------------------------------------------------

export type PostView = {
  id: string;
  type: string;
  title: string | null;
  text: string;
  publishedAt: Date | string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  author: {
    id: string;
    name: string;
    avatarId: string | null;
    handle: string | null;
    verified: boolean;
  };
  images: string[];
  video: { url: string; mimeType: string } | null;
  likedByMe: boolean;
  savedByMe: boolean;
};

type RawPost = Prisma.PostGetPayload<{
  include: { author: { select: { id: true; name: true; avatarKey: true; role: true } } };
}>;

export async function hydratePosts(posts: RawPost[], viewerId: string | null): Promise<PostView[]> {
  if (posts.length === 0) return [];

  const mediaIds = new Set<string>();
  for (const p of posts) {
    if (p.mediaIds) {
      try {
        for (const id of JSON.parse(p.mediaIds) as string[]) mediaIds.add(id);
      } catch {
        // ignore malformed
      }
    }
    if (p.videoId) mediaIds.add(p.videoId);
  }

  const authorIds = [...new Set(posts.map((p) => p.authorId))];

  const [media, handles, myReactions, mySaves] = await Promise.all([
    mediaIds.size > 0
      ? db.media.findMany({
          where: { id: { in: [...mediaIds] } },
          select: { id: true, mimeType: true },
        })
      : Promise.resolve([]),
    db.teacherProfile.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true, handle: true, verifiedStatus: true },
    }),
    viewerId
      ? db.reaction.findMany({
          where: { userId: viewerId, postId: { in: posts.map((p) => p.id) } },
          select: { postId: true },
        })
      : Promise.resolve([]),
    viewerId
      ? db.savedPost.findMany({
          where: { userId: viewerId, postId: { in: posts.map((p) => p.id) } },
          select: { postId: true },
        })
      : Promise.resolve([]),
  ]);

  const mediaById = new Map(media.map((m) => [m.id, m]));
  const handleById = new Map(handles.map((h) => [h.userId, h]));
  const likedSet = new Set(myReactions.map((r) => r.postId));
  const savedSet = new Set(mySaves.map((s) => s.postId));

  return posts.map((p) => {
    const imageIds: string[] = p.mediaIds ? safeJsonArray(p.mediaIds) : [];
    const images = imageIds
      .filter((id) => mediaById.get(id)?.mimeType.startsWith("image/"))
      .map((id) => `/api/media/${id}`);
    const videoMedia = p.videoId ? mediaById.get(p.videoId) : undefined;
    const authorProfile = handleById.get(p.authorId);
    return {
      id: p.id,
      type: p.type,
      title: p.title,
      text: p.text,
      publishedAt: p.publishedAt,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      viewCount: p.viewCount,
      author: {
        id: p.author.id,
        name: p.author.name,
        avatarId: p.author.avatarKey,
        handle: authorProfile?.handle ?? null,
        verified: authorProfile?.verifiedStatus === "verified",
      },
      images,
      video:
        videoMedia && videoMedia.mimeType.startsWith("video/")
          ? { url: `/api/media/${videoMedia.id}`, mimeType: videoMedia.mimeType }
          : null,
      likedByMe: likedSet.has(p.id),
      savedByMe: savedSet.has(p.id),
    };
  });
}

function safeJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed.filter((x) => typeof x === "string") as string[]) : [];
  } catch {
    return [];
  }
}

export const POST_INCLUDE = {
  include: {
    author: { select: { id: true, name: true, avatarKey: true, role: true } },
  },
} satisfies Prisma.PostDefaultArgs;

// ---------------------------------------------------------------------------
// Teacher profile page
// ---------------------------------------------------------------------------

export async function getTeacherPageData(handle: string, viewerId: string | null) {
  const profile = await db.teacherProfile.findUnique({
    where: { handle },
    select: {
      id: true,
      userId: true,
      handle: true,
      tagline: true,
      bio: true,
      mode: true,
      experienceYears: true,
      qualifications: true,
      consentPublic: true,
      verifiedStatus: true,
      verifiedAt: true,
      coverKey: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, avatarKey: true, status: true, createdAt: true },
      },
      subjects: { select: { subject: true } },
      districts: { select: { district: true } },
      grades: { select: { grade: true } },
      languages: { select: { language: true } },
    },
  });

  if (!profile || !profile.consentPublic || profile.user.status !== "active") return null;

  const teacherId = profile.userId;

  const [reviewAgg, reviews, followerCount, isFollowing, posts, quizzes, badges, viewerEligibility, viewerReview, attemptCount] =
    await Promise.all([
      db.review.aggregate({
        where: { teacherId, status: "published" },
        _avg: { stars: true, clarity: true, support: true, organization: true },
        _count: { _all: true },
      }),
      db.review.findMany({
        where: { teacherId, status: "published" },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { author: { select: { id: true, name: true, avatarKey: true } } },
      }),
      db.follow.count({ where: { teacherId } }),
      viewerId && viewerId !== teacherId
        ? db.follow
            .findUnique({ where: { followerId_teacherId: { followerId: viewerId, teacherId } } })
            .then((f) => f !== null)
        : Promise.resolve(false),
      db.post.findMany({
        where: { authorId: teacherId, moderationStatus: "approved" },
        orderBy: { publishedAt: "desc" },
        take: 40,
        include: { author: { select: { id: true, name: true, avatarKey: true, role: true } } },
      }),
      db.quiz.findMany({
        where: {
          teacherId,
          published: true,
          ...(viewerId === teacherId ? {} : { moderationStatus: "approved" }),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      db.badgeGrant.findMany({
        where: { userId: teacherId, active: true },
        include: { badge: true },
      }),
      viewerId
        ? db.reviewEligibility.findUnique({
            where: { teacherId_studentId: { teacherId, studentId: viewerId } },
          })
        : Promise.resolve(null),
      viewerId
        ? db.review.findUnique({
            where: { teacherId_authorId: { teacherId, authorId: viewerId } },
          })
        : Promise.resolve(null),
      db.quizAttempt.count({
        where: { quiz: { teacherId } },
      }),
    ]);

  const postViews = await hydratePosts(posts, viewerId);

  const taxonomy = await getTaxonomy();
  const subjectById = new Map(taxonomy.subjects.map((s) => [s.id, s]));
  const gradeById = new Map(taxonomy.grades.map((g) => [g.id, g]));
  const quizzesWithMeta = quizzes.map((q) => ({
    ...q,
    subject: q.subjectId ? { name: subjectById.get(q.subjectId)?.name ?? "" } : null,
    grade: q.gradeId ? { name: gradeById.get(q.gradeId)?.name ?? "" } : null,
  }));

  const stars = reviews.map((r) => r.stars);

  return {
    profile,
    teacherId,
    postViews,
    quizzes: quizzesWithMeta,
    badges,
    reviews,
    reviewAgg,
    stars,
    followerCount,
    isFollowing,
    viewerEligibility,
    viewerReview,
    attemptCount,
    isSelf: viewerId === teacherId,
  };
}

export type TeacherPageData = NonNullable<Awaited<ReturnType<typeof getTeacherPageData>>>;

// ---------------------------------------------------------------------------
// Simple helpers
// ---------------------------------------------------------------------------

export async function getRecentPosts(limit: number, viewerId: string | null) {
  const posts = await db.post.findMany({
    where: { moderationStatus: "approved", visibility: "public", author: { status: "active" } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    ...POST_INCLUDE,
  });
  return hydratePosts(posts, viewerId);
}

export async function getTopReviews(limit = 6) {
  return db.review.findMany({
    where: {
      status: "published",
      stars: 5,
      feedback: { not: "" },
      author: { status: "active" },
      teacher: { status: "active", teacherProfile: { consentPublic: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      stars: true,
      feedback: true,
      createdAt: true,
      author: { select: { name: true, avatarKey: true } },
      teacher: {
        select: {
          name: true,
          teacherProfile: { select: { handle: true } },
        },
      },
    },
  });
}

export async function getFeedPosts({
  scope,
  viewerId,
  limit = 12,
  before = null,
}: {
  scope: "latest" | "following";
  viewerId: string | null;
  limit?: number;
  before?: Date | null;
}): Promise<{ postViews: PostView[]; nextCursor: string | null }> {
  const where: Prisma.PostWhereInput = { moderationStatus: "approved" };

  if (viewerId) {
    const memberships = await db.membership.findMany({
      where: { memberId: viewerId, status: "active" },
      select: { tier: { select: { teacherId: true } } },
    });
    const memberTeacherIds = memberships.map((m) => m.tier.teacherId);
    const or: Prisma.PostWhereInput[] = [{ visibility: "public" }, { authorId: viewerId }];
    if (memberTeacherIds.length > 0) {
      or.push({ visibility: "members", authorId: { in: memberTeacherIds } });
    }
    where.OR = or;
  } else {
    where.visibility = "public";
  }

  if (scope === "following") {
    if (!viewerId) return { postViews: [], nextCursor: null };
    const follows = await db.follow.findMany({
      where: { followerId: viewerId },
      select: { teacherId: true },
    });
    where.authorId = { in: follows.map((f) => f.teacherId) };
  }

  if (before) where.publishedAt = { lt: before };

  const posts = await db.post.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...POST_INCLUDE,
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  const postViews = await hydratePosts(page, viewerId);
  const nextCursor = hasMore ? page[page.length - 1]!.publishedAt.toISOString() : null;

  return { postViews, nextCursor };
}
