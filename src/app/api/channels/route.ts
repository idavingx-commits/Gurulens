/**
 * Channel API - Create and list channels
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createChannel,
  getUserChannels,
  getChannelUsage,
  searchChannels,
  getTrendingChannels,
} from "@/lib/channels";
import { db } from "@/lib/db";
import { getOrgAccess, getOrgCapacity } from "@/lib/organizations";
import { z } from "zod";

const createChannelSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private", "members"]).optional(),
  type: z.enum(["personal", "institute", "school"]).optional(),
  organizationId: z.string().optional(),
  avatarKey: z.string().trim().min(1).optional(),
  coverKey: z.string().trim().min(1).optional(),
});

// GET: List user's channels or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Public: Search channels
    if (action === "search") {
      const query = searchParams.get("q") || "";
      const type = searchParams.get("type") as "personal" | "institute" | "school" | undefined;
      const channels = await searchChannels(query, { type });
      return NextResponse.json({ channels });
    }

    // Public: Trending channels
    if (action === "trending") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const channels = await getTrendingChannels(limit);
      return NextResponse.json({ channels });
    }

    // Authenticated: User's channels
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await getUserChannels(session.user.id);
    const usage = await getChannelUsage(session.user.id);

    return NextResponse.json({
      channels,
      usage,
    });
  } catch (error) {
    console.error("Error in GET /api/channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

// POST: Create new channel
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createChannelSchema.parse(body);

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

    // Organization channels: membership + campus quota instead of the personal limit.
    if (data.organizationId) {
      const org = await db.organization.findUnique({
        where: { id: data.organizationId },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json({ error: "Organization not found." }, { status: 404 });
      }

      const access = await getOrgAccess(session.user.id, session.user.role, data.organizationId);
      if (!access.canManage) {
        return NextResponse.json(
          { error: "You don't have permission to create channels for this campus." },
          { status: 403 },
        );
      }

      const capacity = await getOrgCapacity(data.organizationId);
      if (capacity.usage.channels >= capacity.limits.channelQuota) {
        return NextResponse.json(
          {
            error: "Campus channel limit reached",
            message: `This campus has reached its channel limit (${capacity.limits.channelQuota}). Ask an owner to raise the plan limit.`,
          },
          { status: 403 },
        );
      }
    }

    // Check channel limit for personal channels
    if (!data.organizationId) {
      const usage = await getChannelUsage(session.user.id);
      if (!usage.canCreate) {
        return NextResponse.json(
          {
            error: "Channel limit reached",
            message: `You have reached your channel limit (${usage.limit}). Upgrade your plan to create more channels.`,
            usage,
          },
          { status: 403 }
        );
      }
    }

    const channel = await createChannel({
      ownerId: session.user.id,
      ownerType: data.organizationId ? "organization" : "user",
      organizationId: data.organizationId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      visibility: data.visibility,
      type: data.type,
      avatarKey: data.avatarKey,
      coverKey: data.coverKey,
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("URL already exists")) {
      return NextResponse.json(
        { error: "A channel with this URL already exists" },
        { status: 409 }
      );
    }

    console.error("Error in POST /api/channels:", error);
    return NextResponse.json(
      { error: "Failed to create channel" },
      { status: 500 }
    );
  }
}
