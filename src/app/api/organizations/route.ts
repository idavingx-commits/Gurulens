/**
 * Organizations API - Institutes and Schools management
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createOrganization,
  getUserOrganizations,
  getOrgStats,
} from "@/lib/organizations";
import { checkPermission } from "@/lib/roles";
import { z } from "zod";

const createOrgSchema = z.object({
  type: z.enum(["institute", "school"]),
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  nameSi: z.string().optional(),
  description: z.string().max(1000).optional(),
  logoKey: z.string().optional(),
  coverKey: z.string().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

// GET: List user's organizations
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizations = await getUserOrganizations(session.user.id);

    // Get stats for each organization
    const orgsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const stats = await getOrgStats(org.id);
        return { ...org, stats };
      })
    );

    return NextResponse.json({ organizations: orgsWithStats });
  } catch (error) {
    console.error("Error in GET /api/organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST: Create new organization
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only teachers can create institutes, admins can create schools
    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only teachers can create organizations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createOrgSchema.parse(body);

    // Schools can only be created by admins (for now)
    if (data.type === "school" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Schools must be registered through the admin portal" },
        { status: 403 }
      );
    }

    const organization = await createOrganization({
      ...data,
      ownerId: session.user.id,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error in POST /api/organizations:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
