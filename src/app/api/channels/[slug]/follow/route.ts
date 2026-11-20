/**
 * Channel Follow/Unfollow API
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChannelBySlug, toggleChannelFollow, isFollowingChannel } from "@/lib/channels";

// POST: Toggle follow status
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

    // Can't follow your own channel
    if (channel.ownerType === "user" && channel.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot follow your own channel" },
        { status: 400 }
      );
    }

    const result = await toggleChannelFollow(channel.id, session.user.id);

    return NextResponse.json({
      following: result.following,
      message: result.following
        ? `You are now following ${channel.name}`
        : `You have unfollowed ${channel.name}`,
    });
  } catch (error) {
    console.error("Error in POST /api/channels/[slug]/follow:", error);
    return NextResponse.json(
      { error: "Failed to update follow status" },
      { status: 500 }
    );
  }
}

// GET: Check follow status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ following: false });
    }

    const { slug } = await params;
    const channel = await getChannelBySlug(slug);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const following = await isFollowingChannel(channel.id, session.user.id);

    return NextResponse.json({ following });
  } catch (error) {
    console.error("Error in GET /api/channels/[slug]/follow:", error);
    return NextResponse.json(
      { error: "Failed to check follow status" },
      { status: 500 }
    );
  }
}
