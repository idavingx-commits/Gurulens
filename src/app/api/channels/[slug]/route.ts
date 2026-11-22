/**
 * Channel API - Single channel operations
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getChannelBySlug,
  updateChannel,
  deleteChannel,
  isFollowingChannel,
} from "@/lib/channels";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const updateChannelSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private", "members"]).optional(),
  avatarKey: z.string().trim().min(1).nullable().optional(),
  coverKey: z.string().trim().min(1).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// GET: Get channel details
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

    // Check if user is following
    const session = await getSession();
    let isFollowing = false;
    let canManage = false;

    if (session) {
      isFollowing = await isFollowingChannel(channel.id, session.user.id);
      canManage =
        (channel.ownerType === "user" && channel.ownerId === session.user.id) ||
        (channel.organizationId
          ? await checkPermission(session.user.id, "channel:update", {
              organizationId: channel.organizationId,
            })
          : false);
    }

    return NextResponse.json({
      channel,
      isFollowing,
      canManage,
    });
  } catch (error) {
    console.error("Error in GET /api/channels/[slug]:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 }
    );
  }
}

// PATCH: Update channel
export async function PATCH(
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

    // Check permission
    const canManage =
      (channel.ownerType === "user" && channel.ownerId === session.user.id) ||
      (channel.organizationId
        ? await checkPermission(session.user.id, "channel:update", {
            organizationId: channel.organizationId,
          })
        : false);

    if (!canManage) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateChannelSchema.parse(body);

    for (const [field, kind] of [
      ["avatarKey", "channel_avatar"],
      ["coverKey", "channel_cover"],
    ] as const) {
      const mediaId = data[field];
      if (!mediaId) continue;
      const media = await db.media.findFirst({
        where: { id: mediaId, ownerId: session.user.id, kind },
        select: { id: true },
      });
      if (!media) {
        return NextResponse.json({ error: "Invalid channel image." }, { status: 400 });
      }
    }

    const updated = await updateChannel(channel.id, {
      ...data,
      settings: data.settings ? JSON.stringify(data.settings) : undefined,
    });

    return NextResponse.json({ channel: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in PATCH /api/channels/[slug]:", error);
    return NextResponse.json(
      { error: "Failed to update channel" },
      { status: 500 }
    );
  }
}

// DELETE: Delete (deactivate) channel
export async function DELETE(
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

    // Check permission
    const canDelete =
      (channel.ownerType === "user" && channel.ownerId === session.user.id) ||
      (channel.organizationId
        ? await checkPermission(session.user.id, "channel:delete", {
            organizationId: channel.organizationId,
          })
        : false);

    if (!canDelete) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    await deleteChannel(channel.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/channels/[slug]:", error);
    return NextResponse.json(
      { error: "Failed to delete channel" },
      { status: 500 }
    );
  }
}
