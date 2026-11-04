import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { existsSync } from "node:fs";
import path from "node:path";

const db = new PrismaClient();

const TEACHER_NAMES = [
  "Anuradha Perera",
  "Nimali Fernando",
  "Kasun Jayawardena",
  "Dilhani Rathnayake",
  "Tharindu Silva",
  "Sachini Wijesekara",
  "Ruwan Bandara",
  "Ishara Gunasekara",
  "Chamari Dissanayake",
  "Pasindu Herath",
  "Nadeesha Kumari",
  "Asanka Weerasinghe",
  "Hiruni Ekanayake",
  "Manoj Peiris",
  "Sanduni Alwis",
  "Dinesh Rajapaksha",
];

const STUDENT_NAMES = [
  "Kavindu Silva",
  "Sethmi Perera",
  "Ravindu Fernando",
  "Nethmi Jayasuriya",
  "Yasiru Bandara",
  "Hiruni Senanayake",
];

const SUBJECTS: Array<[string, string, string]> = [
  ["mathematics", "Mathematics", "ගණිතය"],
  ["science", "Science", "විද්‍යාව"],
  ["combined-maths", "Combined Mathematics", "සංයුක්ත ගණිතය"],
  ["physics", "Physics", "භෞතික විද්‍යාව"],
  ["chemistry", "Chemistry", "රසායන විද්‍යාව"],
  ["biology", "Biology", "ජීව විද්‍යාව"],
  ["ict", "ICT", "තොරතුරු තාක්ෂණය"],
  ["english", "English", "ඉංග්‍රීසි"],
  ["sinhala", "Sinhala", "සිංහල"],
  ["tamil", "Tamil", "දෙමළ"],
  ["history", "History", "ඉතිහාසය"],
  ["geography", "Geography", "භූගෝල විද්‍යාව"],
  ["business-studies", "Business Studies", "ව්‍යාපාර අධ්‍යයනය"],
  ["accounting", "Accounting", "ගිණුම්කරණය"],
  ["economics", "Economics", "ආර්ථික විද්‍යාව"],
  ["political-science", "Political Science", "දේශපාලන විද්‍යාව"],
  ["buddhism", "Buddhism", "බුද්ධ ධර්මය"],
  ["health-science", "Health Science", "සෞඛ්‍ය විද්‍යාව"],
  ["agriculture", "Agriculture", "කෘෂිකර්මය"],
  ["statistics", "Statistics", "සංඛ්‍යානය"],
  ["music", "Music", "සංගීතය"],
  ["art", "Art", "චිත්‍ර කලාව"],
];

const DISTRICTS: Array<[string, string, string, string]> = [
  ["colombo", "Colombo", "කොළඹ", "Western"],
  ["gampaha", "Gampaha", "ගම්පහ", "Western"],
  ["kalutara", "Kalutara", "කළුතර", "Western"],
  ["kandy", "Kandy", "මහනුවර", "Central"],
  ["matale", "Matale", "මාතලේ", "Central"],
  ["nuwara-eliya", "Nuwara Eliya", "නුවරඑළිය", "Central"],
  ["galle", "Galle", "ගාල්ල", "Southern"],
  ["matara", "Matara", "මාතර", "Southern"],
  ["hambantota", "Hambantota", "හම්බන්තොට", "Southern"],
  ["jaffna", "Jaffna", "යාපනය", "Northern"],
  ["kilinochchi", "Kilinochchi", "කිලිනොච්චි", "Northern"],
  ["mannar", "Mannar", "මන්නාරම", "Northern"],
  ["vavuniya", "Vavuniya", "වවුනියාව", "Northern"],
  ["mullaitivu", "Mullaitivu", "මුලතිව්", "Northern"],
  ["batticaloa", "Batticaloa", "මඩකලපුව", "Eastern"],
  ["ampara", "Ampara", "අම්පාර", "Eastern"],
  ["trincomalee", "Trincomalee", "ත්‍රිකුණාමලය", "Eastern"],
  ["kurunegala", "Kurunegala", "කුරුණෑගල", "North Western"],
  ["puttalam", "Puttalam", "පුත්තලම", "North Western"],
  ["anuradhapura", "Anuradhapura", "අනුරාධපුරය", "North Central"],
  ["polonnaruwa", "Polonnaruwa", "පොළොන්නරුව", "North Central"],
  ["badulla", "Badulla", "බදුල්ල", "Uva"],
  ["monaragala", "Monaragala", "මොණරාගල", "Uva"],
  ["ratnapura", "Ratnapura", "රත්නපුර", "Sabaragamuwa"],
  ["kegalle", "Kegalle", "කෑගල්ල", "Sabaragamuwa"],
];

const GRADES: Array<[string, string, number]> = [
  ["grade-6", "Grade 6", 6],
  ["grade-7", "Grade 7", 7],
  ["grade-8", "Grade 8", 8],
  ["grade-9", "Grade 9", 9],
  ["grade-10", "Grade 10", 10],
  ["grade-11", "Grade 11", 11],
  ["grade-12", "Grade 12", 12],
  ["grade-13", "Grade 13", 13],
  ["ol", "O/L Exam", 100],
  ["al", "A/L Exam", 101],
];

const TEACHER_DATA: Array<{
  subjects: string[];
  districts: string[];
  grades: string[];
  languages: string[];
  mode: string;
  tagline: string;
  bio: string;
  years: number;
  quals: string;
  status: string;
  ratingPool: number[];
}> = [
  { subjects: ["physics"], districts: ["colombo", "gampaha", "kandy"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala"], mode: "both", tagline: "ජීවිතයට Physics", bio: "A/L Physics with a focus on real understanding — from theory to final paper practice. 10+ years of island-wide results.", years: 11, quals: "B.Sc. Engineering, University of Moratuwa", status: "verified", ratingPool: [5, 5, 5, 5, 4, 5, 5, 4] },
  { subjects: ["combined-maths", "mathematics"], districts: ["kandy"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala", "english"], mode: "physical", tagline: "Maths that finally makes sense", bio: "Combined Maths for A/L students in Kandy. Small groups, weekly papers and personal progress tracking.", years: 8, quals: "B.Sc. Mathematics (Special), University of Peradeniya", status: "verified", ratingPool: [5, 4, 5, 5, 4, 4] },
  { subjects: ["english"], districts: ["colombo"], grades: ["grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "ol"], languages: ["english"], mode: "online", tagline: "Speak English with confidence", bio: "Spoken English and O/L English classes online. Interactive sessions with real conversation practice.", years: 6, quals: "BA in English, University of Colombo · TESOL certified", status: "verified", ratingPool: [5, 5, 4, 5, 5, 4, 5] },
  { subjects: ["chemistry"], districts: ["gampaha", "colombo"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala"], mode: "both", tagline: "Chemistry without fear", bio: "Organic, inorganic and physical chemistry broken into simple steps. Revision papers with full discussion.", years: 9, quals: "B.Sc. Chemistry (Special), University of Kelaniya", status: "verified", ratingPool: [4, 5, 5, 4, 4, 5] },
  { subjects: ["ict"], districts: ["colombo", "gampaha"], grades: ["grade-10", "grade-11", "grade-12", "grade-13", "ol", "al"], languages: ["sinhala", "english"], mode: "online", tagline: "Code your future", bio: "ICT from O/L to A/L — practical coding, databases and past paper mastery.", years: 7, quals: "B.Sc. Computer Science, University of Colombo", status: "verified", ratingPool: [5, 5, 5, 4, 5, 4, 5, 5] },
  { subjects: ["biology"], districts: ["galle", "matara"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala"], mode: "physical", tagline: "Biology is life 🧬", bio: "A/L Biology with diagram-based teaching and structured revision. Southern province classes.", years: 10, quals: "MBBS, University of Ruhuna", status: "verified", ratingPool: [4, 4, 5, 4, 5] },
  { subjects: ["mathematics", "science"], districts: ["kurunegala"], grades: ["grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "ol"], languages: ["sinhala"], mode: "both", tagline: "Maths & Science for Grades 6-11", bio: "Building strong foundations for scholarship and O/L students in Kurunegala.", years: 5, quals: "B.Ed., University of Wayamba", status: "verified", ratingPool: [5, 5, 5, 5, 5] },
  { subjects: ["sinhala", "history"], districts: ["kandy", "matale"], grades: ["grade-10", "grade-11", "ol"], languages: ["sinhala"], mode: "both", tagline: "සිංහල භාෂාව සරලව", bio: "O/L Sinhala language and literature with easy memory techniques and model answers.", years: 12, quals: "BA (Hons) Sinhala, University of Peradeniya", status: "verified", ratingPool: [4, 5, 4, 5, 4] },
  { subjects: ["accounting", "business-studies"], districts: ["colombo"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala", "english"], mode: "online", tagline: "Accounts made practical", bio: "A/L Accounting and Business Studies with real-world examples and exam-focused drills.", years: 6, quals: "B.Com (Special), University of Sri Jayewardenepura", status: "in_review", ratingPool: [4, 4, 5, 4] },
  { subjects: ["physics", "science"], districts: ["jaffna"], grades: ["grade-10", "grade-11", "ol"], languages: ["tamil", "english"], mode: "both", tagline: "Physics for everyone", bio: "O/L Science and Physics in Jaffna — bilingual classes in Tamil and English.", years: 8, quals: "B.Sc. Physical Science, University of Jaffna", status: "in_review", ratingPool: [5, 4, 5, 5] },
  { subjects: ["economics"], districts: ["colombo", "gampaha"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala", "english"], mode: "online", tagline: "Economics decoded", bio: "A/L Economics with current Sri Lankan examples, graphs and structured essay guidance.", years: 4, quals: "B.Sc. Economics (Special), University of Colombo", status: "pending", ratingPool: [4, 5, 4] },
  { subjects: ["buddhism"], districts: ["kandy"], grades: ["grade-10", "grade-11", "ol"], languages: ["sinhala"], mode: "physical", tagline: "බුද්ධ ධර්මය - පැහැදිලිව", bio: "O/L Buddhism with story-based teaching and past paper analysis.", years: 15, quals: "BA (Hons) Buddhist Studies, University of Peradeniya", status: "pending", ratingPool: [5, 5, 5] },
  { subjects: ["art", "music"], districts: ["gampaha"], grades: ["grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "ol"], languages: ["sinhala"], mode: "physical", tagline: "Create with confidence", bio: "Art and music for school students — portfolio building and exam preparation.", years: 9, quals: "BFA, University of the Visual & Performing Arts", status: "none", ratingPool: [5, 4, 5] },
  { subjects: ["science", "mathematics"], districts: ["anuradhapura"], grades: ["grade-6", "grade-7", "grade-8", "grade-9"], languages: ["sinhala"], mode: "physical", tagline: "Foundation first", bio: "Primary and junior secondary Maths & Science in Anuradhapura.", years: 7, quals: "B.Ed (Hons), University of Ruhuna", status: "none", ratingPool: [4, 5, 4, 4] },
  { subjects: ["english"], districts: ["matara", "galle"], grades: ["grade-1", "grade-6", "grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "ol"], languages: ["english", "sinhala"], mode: "both", tagline: "English from the start", bio: "Young learners and O/L English — phonics, grammar and speaking practice.", years: 3, quals: "Diploma in English Teaching (NIE)", status: "none", ratingPool: [5, 4, 5, 5] },
  { subjects: ["agriculture", "health-science"], districts: ["badulla"], grades: ["grade-12", "grade-13", "al"], languages: ["sinhala"], mode: "both", tagline: "Bio systems made simple", bio: "A/L Agriculture and Health Science for Badulla region students.", years: 5, quals: "B.Sc. Agriculture, University of Peradeniya", status: "pending", ratingPool: [4, 4, 5] },
];

const REVIEW_TEXT = [
  "නියම පන්තියක් සර්. සරලව තේරෙන විදියට උගන්නනවා. ප්‍රශ්න පත්‍ර වලට හොඳ සූදානමක් ලැබුණා.",
  "Explains difficult concepts with everyday examples. My marks improved within two terms.",
  "Classes are very organized and on time. The weekly papers really helped me prepare.",
  "හොඳට උගන්නනවා. හැම ප්‍රශ්නයකටම ඉවසීමෙන් උත්තර දෙනවා. නිතරම motivate කරනවා.",
  "Great teacher. Notes are clear and the revision sessions before exams are excellent.",
  "The best class I joined. Simple teaching style and very supportive with doubts on WhatsApp.",
  "පන්තිය හොඳයි, නමුත් සමහර වෙලාවට කෙටි කාලයක් ඇතුලත ගොඩක් දේවල් කරන්න වෙනවා. ඒත් සර් හොඳට කියලා දෙනවා.",
  "Very patient with slow learners. I finally understood this subject after years of struggling.",
  "Exam-focused teaching with past paper discussions. Highly recommended for A/L students.",
  "ප්‍රශ්න පත්‍ර සාකච්ඡාව හරිම ප්‍රයෝජනවත්. අඩුපාඩු හඳුනාගන්න ලේසි වුණා.",
  "Good teacher but classes can feel fast sometimes. Ask questions early and you will keep up.",
  "Excellent guidance beyond the syllabus too. Learned exam time management and study habits.",
];

const POSTS: Array<{ type: string; title?: string; text: string; hasImage: boolean; hasVideo: boolean }> = [
  { type: "post", title: "2026 Revision Timetable", text: "නව වසරේ revision පන්ති කාලසටහන දැන් නිකුත් කරලා තියෙනවා. ප්‍රශ්න පත්‍ර සාකච්ඡා සතියක් ඇතුලත පැවැත්වෙනවා. ඔබේ ප්‍රගතිය සතිපතා බලාගන්න.", hasImage: true, hasVideo: false },
  { type: "announcement", text: "Free seminar this Saturday at 4 PM — open to all students preparing for the final paper. Bring your past paper questions!", hasImage: false, hasVideo: false },
  { type: "lesson", title: "Quick lesson: Newton's Third Law in real life", text: "🚀 Simple explanation with three everyday examples — from walking to rocket launches. Save this post for your revision notes.", hasImage: true, hasVideo: false },
  { type: "reel", text: "30-second tip: the single most common mistake in this topic. Watch till the end! 🎯", hasImage: false, hasVideo: true },
  { type: "video", title: "Full lesson recording: Past Paper Discussion #4", text: "Full recording of last week's paper discussion. Chapter timestamps in the description. ලකුණු වැඩි කරගන්න මේ ක්‍රමේ බලන්න.", hasImage: false, hasVideo: true },
  { type: "post", text: "Three study habits that made the biggest difference for my top students: 1) daily 25-minute focused blocks, 2) rewrite wrong answers, 3) explain concepts out loud.", hasImage: true, hasVideo: false },
];

async function wipe() {
  const delegates: Array<{ deleteMany: () => Promise<unknown> }> = [
    db.auditLog, db.moderationAction, db.report, db.notification, db.membership, db.membershipTier,
    db.quizAttempt, db.quizQuestion, db.quiz, db.reviewEligibility, db.enrollmentCode, db.review,
    db.savedPost, db.reaction, db.comment, db.follow, db.post, db.media, db.verificationRequest,
    db.badgeGrant, db.badge, db.teacherSubject, db.teacherDistrict, db.teacherGrade, db.teacherLanguage,
    db.teacherProfile, db.session, db.user, db.subject, db.district, db.grade, db.language, db.setting,
  ];
  for (const d of delegates) await d.deleteMany();
}

async function main() {
  console.log("Seeding GuruLens…");
  await wipe();

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  const [languages, subjects, districts, grades] = await Promise.all([
    Promise.all([
      db.language.create({ data: { slug: "sinhala", name: "Sinhala" } }),
      db.language.create({ data: { slug: "english", name: "English" } }),
      db.language.create({ data: { slug: "tamil", name: "Tamil" } }),
    ]),
    Promise.all(SUBJECTS.map(([slug, name, nameSi]) => db.subject.create({ data: { slug, name, nameSi } }))),
    Promise.all(DISTRICTS.map(([slug, name, nameSi, province]) => db.district.create({ data: { slug, name, nameSi, province } }))),
    Promise.all(GRADES.map(([slug, name, order]) => db.grade.create({ data: { slug, name, order } }))),
  ]);

  const langBySlug = new Map(languages.map((l) => [l.slug, l]));
  const subjBySlug = new Map(subjects.map((s) => [s.slug, s]));
  const distBySlug = new Map(districts.map((d) => [d.slug, d]));
  const gradeBySlug = new Map(grades.map((g) => [g.slug, g]));

  // Grades used by the extra young-learners teacher (not in GRADES list above).
  const grade1 = await db.grade.create({ data: { slug: "grade-1", name: "Grade 1", order: 1 } });
  gradeBySlug.set("grade-1", grade1);

  const badges = await Promise.all([
    db.badge.create({ data: { key: "verified-teacher", name: "Verified Teacher", nameSi: "තහවුරු කළ ගුරුවරයා", description: "Identity and claimed qualifications reviewed and approved by GuruLens admins.", kind: "verification" } }),
    db.badge.create({ data: { key: "highly-rated", name: "Highly Rated", description: "Consistently high ratings from eligible students with a minimum review count.", kind: "achievement" } }),
    db.badge.create({ data: { key: "active-educator", name: "Active Educator", description: "Regularly publishes lessons, videos and quizzes for students.", kind: "achievement" } }),
    db.badge.create({ data: { key: "community-contributor", name: "Community Contributor", description: "Consistently safe, helpful and constructive contributions.", kind: "achievement" } }),
  ]);
  const badgeByKey = new Map(badges.map((b) => [b.key, b]));

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@gurulens.lk";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "GuruLens#Admin2026";
  const adminHash = await bcrypt.hash(adminPassword, 11);

  const admin = await db.user.create({
    data: { email: adminEmail, passwordHash: adminHash, role: "admin", name: "GuruLens Admin", ageEligible: true, emailVerified: true },
  });
  await db.user.create({
    data: { email: "moderator@gurulens.lk", passwordHash: adminHash, role: "moderator", name: "GuruLens Moderator", ageEligible: true, emailVerified: true },
  });

  const demoPassword = "Demo#2026";
  const demoHash = await bcrypt.hash(demoPassword, 11);

  // Media rows for seed files (one row per physical file, shared by references)
  const mediaCache = new Map<string, string>();
  async function seedMedia(ownerId: string, kind: string, file: string, mime: string, size: number) {
    const cacheKey = `${kind}/${file}`;
    const cached = mediaCache.get(cacheKey);
    if (cached) return { id: cached };
    const m = await db.media.create({
      data: { ownerId, kind, storageKey: `seed/${file}`, mimeType: mime, sizeBytes: size, visibility: "public" },
    });
    mediaCache.set(cacheKey, m.id);
    return m;
  }

  const hasVideo = existsSync(path.join(process.cwd(), "storage", "seed", "sample1.mp4"));

  const teachers: Array<{ userId: string; profileId: string; handle: string }> = [];

  for (let i = 0; i < TEACHER_DATA.length; i++) {
    const t = TEACHER_DATA[i]!;
    const name = TEACHER_NAMES[i]!;
    const handle = name.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, "-");
    const email = `${handle}@teachers.gurulens.lk`;

    const user = await db.user.create({
      data: {
        email,
        passwordHash: demoHash,
        role: "teacher",
        name,
        ageEligible: true,
        emailVerified: true,
      },
    });

    const avatar = await seedMedia(user.id, "avatar", `avatar-t${i}.png`, "image/png", 120000);
    const cover = await seedMedia(user.id, "cover", `cover-t${i}.jpg`, "image/jpeg", 180000);

    await db.user.update({ where: { id: user.id }, data: { avatarKey: avatar.id } });

    const profile = await db.teacherProfile.create({
      data: {
        userId: user.id,
        handle,
        tagline: t.tagline,
        bio: t.bio,
        mode: t.mode,
        experienceYears: t.years,
        qualifications: t.quals,
        consentPublic: true,
        verifiedStatus: t.status,
        verifiedAt: t.status === "verified" ? daysAgo(30 + i) : null,
        coverKey: cover.id,
      },
    });

    await db.teacherSubject.createMany({ data: t.subjects.map((s) => ({ teacherId: profile.id, subjectId: subjBySlug.get(s)!.id })) });
    await db.teacherDistrict.createMany({ data: t.districts.map((s) => ({ teacherId: profile.id, districtId: distBySlug.get(s)!.id })) });
    await db.teacherGrade.createMany({ data: t.grades.map((s) => ({ teacherId: profile.id, gradeId: gradeBySlug.get(s)!.id })) });
    await db.teacherLanguage.createMany({ data: t.languages.map((s) => ({ teacherId: profile.id, languageId: langBySlug.get(s)!.id })) });

    if (t.status === "verified") {
      await db.badgeGrant.create({ data: { badgeId: badgeByKey.get("verified-teacher")!.id, userId: user.id, grantedById: admin.id, reason: "Seed verification" } });
      if (t.ratingPool.length >= 5 && t.ratingPool.every((r) => r >= 4)) {
        await db.badgeGrant.create({ data: { badgeId: badgeByKey.get("highly-rated")!.id, userId: user.id, grantedById: admin.id, reason: "Seed: highly rated" } });
      }
      await db.badgeGrant.create({ data: { badgeId: badgeByKey.get("active-educator")!.id, userId: user.id, grantedById: admin.id, reason: "Seed: active" } });
    }

    if (t.status === "pending" || t.status === "in_review") {
      await db.verificationRequest.create({
        data: {
          teacherId: user.id,
          status: t.status,
          evidenceNote: "Submitted degree certificate and teaching experience letters.",
          reviewerId: t.status === "in_review" ? admin.id : null,
        },
      });
    }

    await db.enrollmentCode.create({
      data: { teacherId: user.id, code: `GL-${handle.slice(0, 6).toUpperCase()}-${1000 + i}`, label: "2026 batch", maxUses: 50, uses: 0 },
    });

    teachers.push({ userId: user.id, profileId: profile.id, handle });
  }

  const students: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const name = STUDENT_NAMES[i]!;
    const handle = name.toLowerCase().replace(/\s+/g, ".");
    const user = await db.user.create({
      data: { email: `${handle}@students.gurulens.lk`, passwordHash: demoHash, role: "student", name, ageEligible: true, emailVerified: true },
    });
    const avatar = await seedMedia(user.id, "avatar", `avatar-s${i}.png`, "image/png", 110000);
    await db.user.update({ where: { id: user.id }, data: { avatarKey: avatar.id } });
    students.push({ id: user.id, name });
  }

  // Follows
  for (const student of students) {
    const picks = teachers.filter((_, idx) => (idx + student.name.length) % 3 !== 0).slice(0, 6);
    for (const t of picks) {
      await db.follow.create({ data: { followerId: student.id, teacherId: t.userId, createdAt: daysAgo(20) } });
    }
  }

  // Posts + media + comments + reactions
  let postImageCursor = 0;
  const createdPosts: Array<{ id: string; authorId: string; type: string }> = [];
  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i]!;
    const count = 2 + (i % 3);
    for (let j = 0; j < count; j++) {
      const spec = POSTS[(i + j) % POSTS.length]!;
      let mediaIds: string[] = [];
      let videoId: string | null = null;

      if (spec.hasImage) {
        const file = `post-${postImageCursor % 14}.jpg`;
        postImageCursor++;
        const m = await seedMedia(t.userId, "post_image", file, "image/jpeg", 150000);
        mediaIds = [m.id];
      }

      if (spec.hasVideo && hasVideo) {
        const file = j % 2 === 0 ? "sample1.mp4" : "sample2.mp4";
        const m = await seedMedia(t.userId, "video", file, "video/mp4", 1000000);
        videoId = m.id;
      }

      if ((spec.type === "reel" || spec.type === "video") && !videoId) continue;

      const post = await db.post.create({
        data: {
          authorId: t.userId,
          type: spec.type,
          title: spec.title ?? null,
          text: spec.text,
          mediaIds: mediaIds.length > 0 ? JSON.stringify(mediaIds) : null,
          videoId,
          subjectId: null,
          gradeId: null,
          visibility: "public",
          moderationStatus: "approved",
          publishedAt: daysAgo(2 + j * 3 + (i % 4)),
          likeCount: 0,
          commentCount: 0,
        },
      });
      createdPosts.push({ id: post.id, authorId: t.userId, type: spec.type });

      // Reactions
      let likes = 0;
      for (const s of students) {
        if ((s.name.length + i + j) % 2 === 0) {
          await db.reaction.create({ data: { userId: s.id, postId: post.id, type: "like" } });
          likes++;
        }
      }
      // Comments
      let comments = 0;
      for (const s of students.slice(0, 2)) {
        if ((s.name.length + j) % 2 === 0) {
          await db.comment.create({ data: { postId: post.id, authorId: s.id, text: "නියමයි! මේක save කරගත්තා. තව මේ වගේ දාන්න 🙌", moderationStatus: "approved" } });
          comments++;
        }
      }
      await db.post.update({ where: { id: post.id }, data: { likeCount: likes, commentCount: comments, viewCount: 40 + ((i * 37 + j * 11) % 400) } });
    }
  }

  // Reviews
  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i]!;
    const pool = TEACHER_DATA[i]!.ratingPool;
    const reviewerCount = Math.min(pool.length, students.length);
    for (let j = 0; j < reviewerCount; j++) {
      const s = students[(i + j) % students.length]!;
      const stars = pool[j]!;
      await db.reviewEligibility.create({
        data: { teacherId: t.userId, studentId: s.id, status: "verified", createdAt: daysAgo(60) },
      });
      const review = await db.review.create({
        data: {
          teacherId: t.userId,
          authorId: s.id,
          stars,
          clarity: stars,
          support: Math.max(1, stars - (j % 2)),
          organization: stars,
          feedback: REVIEW_TEXT[(i * 3 + j) % REVIEW_TEXT.length]!,
          eligibilityStatus: "verified",
          status: "published",
          createdAt: daysAgo(40 - (j * 3) + (i % 5)),
        },
      });
      if (j === 0 && TEACHER_DATA[i]!.status === "verified") {
        await db.review.update({
          where: { id: review.id },
          data: {
            teacherReply: "Thank you for the honest feedback! 🙏 See you at the next paper discussion.",
            teacherRepliedAt: daysAgo(30),
          },
        });
      }
    }
  }

  // Quizzes
  const quizSpecs = [
    {
      teacherIdx: 0,
      title: "A/L Physics — Mechanics Basics",
      description: "10-minute quiz on kinematics and Newton's laws. Test yourself before the paper class.",
      subject: "physics",
      grade: "grade-12",
      questions: [
        { text: "Which quantity is a vector?", options: ["Speed", "Distance", "Velocity", "Mass"], correctIndex: 2 },
        { text: "SI unit of force is:", options: ["Joule", "Newton", "Watt", "Pascal"], correctIndex: 1 },
        { text: "An object moving at constant velocity has:", options: ["Zero acceleration", "Zero speed", "Increasing speed", "Zero mass"], correctIndex: 0 },
        { text: "Newton's second law states that:", options: ["F = mv", "F = ma", "F = m/a", "F = a/m"], correctIndex: 1 },
        { text: "Action and reaction forces act on:", options: ["The same object", "Different objects", "Nothing", "Only moving objects"], correctIndex: 1 },
      ],
    },
    {
      teacherIdx: 2,
      title: "O/L English — Grammar Check",
      description: "Quick grammar quiz covering tenses, prepositions and articles.",
      subject: "english",
      grade: "grade-11",
      questions: [
        { text: "Choose the correct sentence:", options: ["She go to school daily.", "She goes to school daily.", "She going to school daily.", "She gone to school daily."], correctIndex: 1 },
        { text: "I have lived here ___ 2010.", options: ["for", "since", "from", "at"], correctIndex: 1 },
        { text: "Choose the correct article: ___ hour", options: ["a", "an", "the", "no article"], correctIndex: 1 },
        { text: "The past tense of 'teach' is:", options: ["teached", "taught", "teaching", "teaches"], correctIndex: 1 },
        { text: "Which is a preposition?", options: ["quickly", "under", "and", "beautiful"], correctIndex: 1 },
      ],
    },
    {
      teacherIdx: 4,
      title: "ICT — Fundamentals Quiz",
      description: "Test your basics: hardware, software, networks and databases.",
      subject: "ict",
      grade: "grade-11",
      questions: [
        { text: "Which one is system software?", options: ["MS Word", "Windows OS", "Photoshop", "Chrome"], correctIndex: 1 },
        { text: "Binary of decimal 5 is:", options: ["101", "110", "100", "111"], correctIndex: 0 },
        { text: "A LAN covers:", options: ["A country", "A small area", "The world", "A continent"], correctIndex: 1 },
        { text: "Primary key is used to:", options: ["Sort files", "Uniquely identify a record", "Encrypt data", "Compress data"], correctIndex: 1 },
      ],
    },
  ];

  for (const qs of quizSpecs) {
    const t = teachers[qs.teacherIdx]!;
    const quiz = await db.quiz.create({
      data: {
        teacherId: t.userId,
        title: qs.title,
        description: qs.description,
        subjectId: subjBySlug.get(qs.subject)?.id ?? null,
        gradeId: gradeBySlug.get(qs.grade)?.id ?? null,
        timeLimitMin: 10,
        published: true,
        createdAt: daysAgo(12),
      },
    });
    for (let k = 0; k < qs.questions.length; k++) {
      const q = qs.questions[k]!;
      await db.quizQuestion.create({
        data: { quizId: quiz.id, order: k, text: q.text, options: JSON.stringify(q.options), correctIndex: q.correctIndex },
      });
    }
    // Attempts
    for (let s = 0; s < 3; s++) {
      const student = students[(qs.teacherIdx + s) % students.length]!;
      const answers = qs.questions.map((q, idx) => (idx + s) % 3 === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex);
      const score = answers.filter((a, idx) => a === qs.questions[idx]!.correctIndex).length;
      await db.quizAttempt.create({
        data: {
          quizId: quiz.id,
          studentId: student.id,
          answers: JSON.stringify(answers),
          score,
          total: qs.questions.length,
          completedAt: daysAgo(5 + s),
        },
      });
    }
  }

  // Membership tiers (Patreon-lite, no payments at launch)
  for (const idx of [0, 2]) {
    const t = teachers[idx]!;
    const tier = await db.membershipTier.create({
      data: {
        teacherId: t.userId,
        name: "Supporter",
        description: "Support my classes and get early access to revision papers.",
        priceLkr: 0,
        perks: JSON.stringify(["Early access to revision papers", "Supporter badge on comments", "Monthly live Q&A"]),
      },
    });
    await db.membership.create({ data: { tierId: tier.id, memberId: students[0]!.id, status: "active" } });
  }

  // Reports (for admin queue demo)
  const somePost = createdPosts[0]!;
  await db.report.create({
    data: { reporterId: students[0]!.id, targetType: "post", targetId: somePost.id, reason: "spam", details: "Demo report: suspected spam content.", status: "open" },
  });
  await db.report.create({
    data: { reporterId: students[1]!.id, targetType: "user", targetId: teachers[9]!.userId, reason: "impersonation", details: "Demo report: checking identity claim.", status: "open" },
  });

  // Settings
  await db.setting.create({ data: { key: "guidelines_version", value: "1.0" } });
  await db.setting.create({ data: { key: "ranking_methodology_version", value: "1.0-bayes-wilson" } });
  await db.setting.create({ data: { key: "platform_notice", value: "Beta: please report any issues to support." } });

  console.log("Done.");
  console.log(`Admin login:    ${adminEmail} / ${adminPassword}`);
  console.log(`Moderator:      moderator@gurulens.lk / ${adminPassword}`);
  console.log(`Demo teacher:   anuradha-perera@teachers.gurulens.lk / ${demoPassword}`);
  console.log(`Demo student:   kavindu.silva@students.gurulens.lk / ${demoPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
