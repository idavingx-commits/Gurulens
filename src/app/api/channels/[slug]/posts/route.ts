/**
 * Channel Posts API
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getChannelBySlug,
  getChannelPosts,
  createChannelPost,
  createVoiceMessage,
  createPoll,
} from "@/lib/channels";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const createPostSchema = z.object({
  type: z.enum(["text", "image", "video", "audio", "document", "poll", "quiz", "announcement"]).optional(),
  content: z.string().max(5000).optional(),
  mediaKeys: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  scheduledAt: z.string().datetime().optional(),
  // For voice messages
  audioKey: z.string().optional(),
  durationSec: z.number().optional(),
  waveform: z.array(z.number()).optional(),
  // For polls
  pollQuestion: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
  pollAllowMultiple: z.boolean().optional(),
  pollEndsAt: z.string().datetime().optional(),
});

// GET: Get channel posts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const channel = await getChannelBySlug(slug);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Check if channel is public or user has access
    const session = await getSession();
    if (channel.visibility !== "public" && !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await getChannelPosts(channel.id, { cursor, limit });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/channels/[slug]/posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

// POST: Create channel post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const channel = await getChannelBySlug(slug);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Check permission to post
    const canPost =
      (channel.ownerType === "user" && channel.ownerId === session.user.id) ||
      (channel.organizationId
        ? await checkPermission(session.user.id, "channel:post", {
            organizationId: channel.organizationId,
          })
        : false);

    if (!canPost) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = createPostSchema.parse(body);

    let post;

    // Handle different post types
    if (data.type === "audio" && data.audioKey && data.durationSec) {
      // Voice message
      post = await createVoiceMessage({
        channelId: channel.id,
        authorId: session.user.id,
        audioKey: data.audioKey,
        durationSec: data.durationSec,
        waveform: data.waveform,
        content: data.content,
      });
    } else if (data.type === "poll" && data.pollQuestion && data.pollOptions) {
      // Poll
      post = await createPoll({
        channelId: channel.id,
        authorId: session.user.id,
        question: data.pollQuestion,
        options: data.pollOptions,
        allowMultiple: data.pollAllowMultiple,
        endsAt: data.pollEndsAt ? new Date(data.pollEndsAt) : undefined,
        content: data.content,
      });
    } else {
      // Regular post
      post = await createChannelPost({
        channelId: channel.id,
        authorId: session.user.id,
        type: data.type,
        content: data.content,
        mediaKeys: data.mediaKeys,
        isPinned: data.isPinned,
        isUrgent: data.isUrgent,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/channels/[slug]/posts:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
