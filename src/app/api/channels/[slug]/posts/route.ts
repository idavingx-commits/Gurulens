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
import { db } from "@/lib/db";
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

    // Never trust media ids from the browser: every attachment must belong to
    // the author and use a channel-safe upload kind.
    const mediaKeys = [...new Set(data.mediaKeys ?? [])];
    if (mediaKeys.length > 4) {
      return NextResponse.json({ error: "You can attach up to 4 files." }, { status: 400 });
    }
    if (mediaKeys.length > 0) {
      const owned = await db.media.findMany({
        where: {
          id: { in: mediaKeys },
          ownerId: session.user.id,
          kind: { in: ["post_image", "post_file", "video"] },
        },
        select: { id: true },
      });
      if (owned.length !== mediaKeys.length) {
        return NextResponse.json({ error: "One or more attachments are invalid." }, { status: 400 });
      }
    }

    let post;

    // Handle different post types
    if (data.type === "audio") {
      if (!data.audioKey) {
        return NextResponse.json({ error: "A voice recording is required." }, { status: 400 });
      }
      const duration = data.durationSec ?? 0;
      if (duration <= 0 || duration > 180) {
        return NextResponse.json({ error: "Voice notes must be under 3 minutes." }, { status: 400 });
      }
      const audio = await db.media.findFirst({
        where: { id: data.audioKey, ownerId: session.user.id, kind: "audio" },
        select: { id: true },
      });
      if (!audio) {
        return NextResponse.json({ error: "Voice recording not found." }, { status: 400 });
      }

      post = await createVoiceMessage({
        channelId: channel.id,
        authorId: session.user.id,
        audioKey: audio.id,
        durationSec: Math.round(duration),
        waveform: data.waveform
          ?.slice(0, 64)
          .map((value) => Math.min(1, Math.max(0, value))),
        content: data.content,
      });
    } else if (data.type === "poll") {
      const options = (data.pollOptions ?? []).map((option) => option.trim()).filter(Boolean);
      const question = data.pollQuestion?.trim() ?? "";
      if (question.length < 3 || options.length < 2 || options.length > 6) {
        return NextResponse.json(
          { error: "Polls need a question and 2–6 options." },
          { status: 400 },
        );
      }
      if (new Set(options).size !== options.length) {
        return NextResponse.json({ error: "Poll options must be unique." }, { status: 400 });
      }

      post = await createPoll({
        channelId: channel.id,
        authorId: session.user.id,
        question,
        options,
        allowMultiple: data.pollAllowMultiple,
        endsAt: data.pollEndsAt ? new Date(data.pollEndsAt) : undefined,
        content: data.content,
      });
    } else {
      if (!data.content?.trim() && mediaKeys.length === 0) {
        return NextResponse.json(
          { error: "Write something or attach a file before posting." },
          { status: 400 },
        );
      }

      post = await createChannelPost({
        channelId: channel.id,
        authorId: session.user.id,
        type: data.type,
        content: data.content?.trim() || undefined,
        mediaKeys: mediaKeys.length > 0 ? mediaKeys : undefined,
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
