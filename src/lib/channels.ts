/**
 * Channel management utilities
 * Supports personal channels, institute channels, and school channels
 * Enforces 3-channel limit for free teachers
 */

import { db } from "./db";
import type { Prisma } from "@prisma/client";

export type ChannelType = "personal" | "institute" | "school";
export type ChannelVisibility = "public" | "private" | "members";
export type ChannelVerificationStatus = "none" | "pending" | "in_review" | "verified" | "rejected";
export type PostType = "text" | "image" | "video" | "audio" | "document" | "poll" | "quiz" | "announcement";
export type ReactionType = "like" | "love" | "clap" | "fire" | "sad";

// Free plan channel limit
const FREE_CHANNEL_LIMIT = 3;

// Check if user can create more channels (enforces 3-channel limit for free users)
export async function canCreateChannel(userId: string): Promise<{ allowed: boolean; reason?: string; current: number; limit: number }> {
  // Count user's personal channels
  const personalChannelCount = await db.channel.count({
    where: {
      ownerId: userId,
      ownerType: "user",
      isActive: true,
    },
  });

  // Check if user has a subscription that overrides the limit
  const subscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trial"] },
    },
    include: {
      plan: true,
    },
  });

  let channelLimit = FREE_CHANNEL_LIMIT;

  if (subscription?.plan) {
    const limits = JSON.parse(subscription.plan.limits || "{}");
    channelLimit = limits.channels ?? FREE_CHANNEL_LIMIT;
    
    // -1 means unlimited
    if (channelLimit === -1) {
      return { allowed: true, current: personalChannelCount, limit: -1 };
    }
  }

  if (personalChannelCount >= channelLimit) {
    return {
      allowed: false,
      reason: `You have reached your channel limit (${channelLimit}). Upgrade your plan to create more channels.`,
      current: personalChannelCount,
      limit: channelLimit,
    };
  }

  return { allowed: true, current: personalChannelCount, limit: channelLimit };
}

// Get user's channel usage
export async function getChannelUsage(userId: string) {
  const checkResult = await canCreateChannel(userId);
  return {
    used: checkResult.current,
    limit: checkResult.limit,
    remaining: checkResult.limit === -1 ? -1 : checkResult.limit - checkResult.current,
    canCreate: checkResult.allowed,
  };
}

// Create a new channel
export async function createChannel(data: {
  ownerId: string;
  ownerType: "user" | "organization";
  organizationId?: string;
  name: string;
  slug: string;
  description?: string;
  avatarKey?: string;
  coverKey?: string;
  visibility?: ChannelVisibility;
  type?: ChannelType;
}) {
  // For personal channels, check the limit
  if (data.ownerType === "user") {
    const canCreate = await canCreateChannel(data.ownerId);
    if (!canCreate.allowed) {
      throw new Error(canCreate.reason);
    }
  }

  // Check slug uniqueness
  const existing = await db.channel.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error("A channel with this URL already exists");
  }

  return db.channel.create({
    data: {
      ownerId: data.ownerId,
      ownerType: data.ownerType,
      organizationId: data.organizationId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      avatarKey: data.avatarKey,
      coverKey: data.coverKey,
      visibility: data.visibility ?? "public",
      type: data.type ?? "personal",
      verifiedStatus: "none",
      followerCount: 0,
      postCount: 0,
      isActive: true,
    },
  });
}

/** Owners and organization managers can edit a channel and its photos. */
export async function canManageChannel(
  channel: { ownerId: string; ownerType: string; organizationId: string | null },
  userId: string,
) {
  if (channel.ownerType === "user" && channel.ownerId === userId) return true;
  if (!channel.organizationId) return false;

  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: channel.organizationId,
        userId,
      },
    },
    select: { role: true, status: true },
  });

  return (
    membership?.status === "active" &&
    ["owner", "admin", "manager"].includes(membership.role)
  );
}

// Get channel by slug
export async function getChannelBySlug(slug: string) {
  return db.channel.findUnique({
    where: { slug },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, verifiedStatus: true },
      },
      _count: {
        select: {
          posts: { where: { publishedAt: { not: null } } },
          followers: true,
        },
      },
    },
  });
}

// Get user's channels
export async function getUserChannels(userId: string) {
  return db.channel.findMany({
    where: {
      ownerId: userId,
      ownerType: "user",
      isActive: true,
    },
    include: {
      _count: {
        select: {
          posts: { where: { publishedAt: { not: null } } },
          followers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get organization's channels
export async function getOrganizationChannels(organizationId: string) {
  return db.channel.findMany({
    where: {
      organizationId,
      isActive: true,
    },
    include: {
      _count: {
        select: {
          posts: { where: { publishedAt: { not: null } } },
          followers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Follow/unfollow channel
export async function toggleChannelFollow(channelId: string, userId: string) {
  const existing = await db.channelFollow.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });

  if (existing) {
    await db.$transaction([
      db.channelFollow.delete({
        where: { channelId_userId: { channelId, userId } },
      }),
      db.channel.update({
        where: { id: channelId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);
    return { following: false };
  }

  await db.$transaction([
    db.channelFollow.create({
      data: { channelId, userId },
    }),
    db.channel.update({
      where: { id: channelId },
      data: { followerCount: { increment: 1 } },
    }),
  ]);
  return { following: true };
}

// Check if user follows channel
export async function isFollowingChannel(channelId: string, userId: string) {
  const follow = await db.channelFollow.findUnique({
    where: { channelId_userId: { channelId, userId } },
  });
  return !!follow;
}

// Get user's followed channels
export async function getFollowedChannels(userId: string) {
  const follows = await db.channelFollow.findMany({
    where: { userId },
    include: {
      channel: {
        include: {
          _count: {
            select: {
              posts: { where: { publishedAt: { not: null } } },
              followers: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return follows.map((f) => f.channel);
}

// Create channel post
export async function createChannelPost(data: {
  channelId: string;
  authorId: string;
  type?: PostType;
  content?: string;
  mediaKeys?: string[];
  isPinned?: boolean;
  isUrgent?: boolean;
  scheduledAt?: Date;
}) {
  const post = await db.channelPost.create({
    data: {
      channelId: data.channelId,
      authorId: data.authorId,
      type: data.type ?? "text",
      content: data.content,
      mediaKeys: data.mediaKeys ? JSON.stringify(data.mediaKeys) : null,
      isPinned: data.isPinned ?? false,
      isUrgent: data.isUrgent ?? false,
      scheduledAt: data.scheduledAt,
      publishedAt: data.scheduledAt ? null : new Date(),
      moderationStatus: "approved",
    },
  });

  // Update channel post count if immediately published
  if (!data.scheduledAt) {
    await db.channel.update({
      where: { id: data.channelId },
      data: { postCount: { increment: 1 } },
    });
  }

  return post;
}

// Get channel posts
export async function getChannelPosts(
  channelId: string,
  options: { limit?: number; cursor?: string; pinnedFirst?: boolean } = {}
) {
  const { limit = 20, cursor, pinnedFirst = true } = options;

  const posts = await db.channelPost.findMany({
    where: {
      channelId,
      publishedAt: { not: null, lte: new Date() },
      moderationStatus: "approved",
    },
    include: {
      author: {
        select: { id: true, name: true, avatarKey: true },
      },
      voiceMessage: true,
      poll: {
        include: {
          votes: true,
        },
      },
      _count: {
        select: { reactions: true },
      },
    },
    orderBy: pinnedFirst
      ? [{ isPinned: "desc" }, { publishedAt: "desc" }]
      : { publishedAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, -1) : posts;

  return {
    posts: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

// Add reaction to post
export async function addPostReaction(postId: string, userId: string, type: ReactionType) {
  const existing = await db.channelReaction.findUnique({
    where: { channelPostId_userId: { channelPostId: postId, userId } },
  });

  if (existing) {
    // Update reaction type
    await db.channelReaction.update({
      where: { id: existing.id },
      data: { type },
    });
    return { action: "updated", type };
  }

  await db.$transaction([
    db.channelReaction.create({
      data: { channelPostId: postId, userId, type },
    }),
    db.channelPost.update({
      where: { id: postId },
      data: { reactionCount: { increment: 1 } },
    }),
  ]);

  return { action: "added", type };
}

// Remove reaction from post
export async function removePostReaction(postId: string, userId: string) {
  const existing = await db.channelReaction.findUnique({
    where: { channelPostId_userId: { channelPostId: postId, userId } },
  });

  if (!existing) return { action: "none" };

  await db.$transaction([
    db.channelReaction.delete({
      where: { id: existing.id },
    }),
    db.channelPost.update({
      where: { id: postId },
      data: { reactionCount: { decrement: 1 } },
    }),
  ]);

  return { action: "removed" };
}

// Create voice message
export async function createVoiceMessage(data: {
  channelId: string;
  authorId: string;
  audioKey: string;
  durationSec: number;
  waveform?: number[];
  content?: string;
}) {
  return db.$transaction(async (tx) => {
    // Create the post
    const post = await tx.channelPost.create({
      data: {
        channelId: data.channelId,
        authorId: data.authorId,
        type: "audio",
        content: data.content,
        publishedAt: new Date(),
        moderationStatus: "approved",
      },
    });

    // Create voice message record
    await tx.voiceMessage.create({
      data: {
        channelPostId: post.id,
        audioKey: data.audioKey,
        durationSec: data.durationSec,
        waveform: data.waveform ? JSON.stringify(data.waveform) : null,
      },
    });

    // Update channel post count
    await tx.channel.update({
      where: { id: data.channelId },
      data: { postCount: { increment: 1 } },
    });

    return post;
  });
}

// Create poll
export async function createPoll(data: {
  channelId: string;
  authorId: string;
  question: string;
  options: string[];
  allowMultiple?: boolean;
  endsAt?: Date;
  content?: string;
}) {
  return db.$transaction(async (tx) => {
    // Create the post
    const post = await tx.channelPost.create({
      data: {
        channelId: data.channelId,
        authorId: data.authorId,
        type: "poll",
        content: data.content,
        publishedAt: new Date(),
        moderationStatus: "approved",
      },
    });

    // Create poll record
    await tx.poll.create({
      data: {
        channelPostId: post.id,
        question: data.question,
        options: JSON.stringify(data.options),
        allowMultiple: data.allowMultiple ?? false,
        endsAt: data.endsAt,
      },
    });

    // Update channel post count
    await tx.channel.update({
      where: { id: data.channelId },
      data: { postCount: { increment: 1 } },
    });

    return post;
  });
}

// Vote on poll
export async function votePoll(pollId: string, userId: string, optionIndexes: number[]) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: { votes: { where: { userId } } },
  });

  if (!poll) throw new Error("Poll not found");
  
  const options = JSON.parse(poll.options) as string[];
  
  // Validate option indexes
  for (const idx of optionIndexes) {
    if (idx < 0 || idx >= options.length) {
      throw new Error("Invalid option index");
    }
  }

  // Check if poll has ended
  if (poll.endsAt && poll.endsAt < new Date()) {
    throw new Error("This poll has ended");
  }

  // If not allowing multiple, only use first option
  const selectedIndexes = poll.allowMultiple ? optionIndexes : [optionIndexes[0]];

  // Remove existing votes
  if (poll.votes.length > 0) {
    await db.pollVote.deleteMany({
      where: { pollId, userId },
    });
  }

  // Add new votes
  await db.pollVote.createMany({
    data: selectedIndexes.map((idx) => ({
      pollId,
      userId,
      optionIndex: idx,
    })),
  });

  return { voted: selectedIndexes };
}

// Get poll results
export async function getPollResults(pollId: string) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    include: { votes: true },
  });

  if (!poll) return null;

  const options = JSON.parse(poll.options) as string[];
  const results = options.map((option, idx) => ({
    option,
    index: idx,
    votes: poll.votes.filter((v) => v.optionIndex === idx).length,
  }));

  const totalVotes = new Set(poll.votes.map((v) => v.userId)).size;

  return {
    question: poll.question,
    options: results,
    totalVotes,
    allowMultiple: poll.allowMultiple,
    endsAt: poll.endsAt,
    hasEnded: poll.endsAt ? poll.endsAt < new Date() : false,
  };
}

// Request channel verification
export async function requestChannelVerification(data: {
  channelId: string;
  evidenceKeys: string[];
  evidenceNote?: string;
}) {
  // Check for existing pending request
  const existing = await db.channelVerificationRequest.findFirst({
    where: {
      channelId: data.channelId,
      status: { in: ["pending", "in_review"] },
    },
  });

  if (existing) {
    throw new Error("A verification request is already pending");
  }

  return db.$transaction(async (tx) => {
    const request = await tx.channelVerificationRequest.create({
      data: {
        channelId: data.channelId,
        evidenceKeys: JSON.stringify(data.evidenceKeys),
        evidenceNote: data.evidenceNote,
        status: "pending",
      },
    });

    await tx.channel.update({
      where: { id: data.channelId },
      data: { verifiedStatus: "pending" },
    });

    return request;
  });
}

// Update channel
export async function updateChannel(
  channelId: string,
  data: Prisma.ChannelUpdateInput
) {
  return db.channel.update({
    where: { id: channelId },
    data,
  });
}

// Delete (deactivate) channel
export async function deleteChannel(channelId: string) {
  return db.channel.update({
    where: { id: channelId },
    data: { isActive: false },
  });
}

// Search channels
export async function searchChannels(query: string, options: { limit?: number; type?: ChannelType } = {}) {
  const { limit = 20, type } = options;

  return db.channel.findMany({
    where: {
      isActive: true,
      visibility: "public",
      ...(type && { type }),
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      _count: {
        select: { followers: true, posts: true },
      },
    },
    orderBy: { followerCount: "desc" },
    take: limit,
  });
}

// Get trending channels
export async function getTrendingChannels(limit = 10) {
  return db.channel.findMany({
    where: {
      isActive: true,
      visibility: "public",
    },
    include: {
      _count: {
        select: { followers: true, posts: true },
      },
    },
    orderBy: [{ followerCount: "desc" }, { postCount: "desc" }],
    take: limit,
  });
}

/** Directory-level totals for the Channels landing page. */
export async function getChannelDirectoryStats() {
  const publicChannel = { isActive: true, visibility: "public" } as const;
  const [channels, posts, followers] = await Promise.all([
    db.channel.count({ where: publicChannel }),
    db.channelPost.count({
      where: {
        publishedAt: { not: null },
        moderationStatus: "approved",
        channel: publicChannel,
      },
    }),
    db.channelFollow.count({ where: { channel: publicChannel } }),
  ]);

  return { channels, posts, followers };
}
