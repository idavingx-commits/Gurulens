/**
 * ClassPulse API - Virtual device management
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createVirtualDevice,
  getOrganizationDevices,
  getDeviceDashboard,
  getClassPulseOverview,
} from "@/lib/classpulse";
import { checkPermission } from "@/lib/roles";
import { db } from "@/lib/db";
import { z } from "zod";

const createDeviceSchema = z.object({
  name: z.string().min(2).max(100),
  organizationId: z.string().optional(),
  classId: z.string().optional(),
});

// GET: List devices or get overview
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const organizationId = searchParams.get("organizationId");

    // Get overview
    if (action === "overview" && organizationId) {
      const hasPermission = await checkPermission(session.user.id, "org:read", {
        organizationId,
      });
      if (!hasPermission) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const overview = await getClassPulseOverview(organizationId);
      return NextResponse.json({ overview });
    }

    // Get single device dashboard
    if (action === "dashboard") {
      const deviceId = searchParams.get("deviceId");
      if (!deviceId) {
        return NextResponse.json({ error: "Device ID required" }, { status: 400 });
      }
      const dashboard = await getDeviceDashboard(deviceId);
      return NextResponse.json({ dashboard });
    }

    // List organization's devices
    if (organizationId) {
      const hasPermission = await checkPermission(session.user.id, "org:read", {
        organizationId,
      });
      if (!hasPermission) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }

      const devices = await getOrganizationDevices(organizationId);
      return NextResponse.json({ devices });
    }

    // List all accessible devices (from all user's organizations)
    const memberships = await db.organizationMember.findMany({
      where: { userId: session.user.id, status: "active" },
      select: { organizationId: true },
    });

    const orgIds = memberships.map((m) => m.organizationId);
    const devices = await db.virtualDevice.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Error in GET /api/classpulse/devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// POST: Create new virtual device
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createDeviceSchema.parse(body);

    // If organization specified, check permission
    if (data.organizationId) {
      const hasPermission = await checkPermission(session.user.id, "org:manage_classes", {
        organizationId: data.organizationId,
      });
      if (!hasPermission) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 });
      }
    }

    const device = await createVirtualDevice({
      name: data.name,
      organizationId: data.organizationId,
      classId: data.classId,
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/classpulse/devices:", error);
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    );
  }
}
