/**
 * Public plan catalogue.
 *
 * Plans live in the `Plan` table so admins can create and edit them from
 * `/admin/plans`. This module only provides the presentation metadata:
 * audience grouping, human labels for feature keys and limit formatting.
 * Unknown feature keys are still shown (prettified) so a newly-added feature
 * never disappears from the pricing page or the admin editor.
 */

export type PlanAudience = "teacher" | "institute" | "campus";

export const PLAN_AUDIENCES: Array<{
  id: PlanAudience;
  label: string;
  shortLabel: string;
  icon: string;
  blurb: string;
  accent: string;
  soft: string;
  ring: string;
  gradient: string;
}> = [
  {
    id: "teacher",
    label: "Private teachers",
    shortLabel: "Teachers",
    icon: "user",
    blurb: "Your profile, classes and channels — everything one teacher needs.",
    accent: "text-brand-700",
    soft: "bg-brand-50 text-brand-700",
    ring: "ring-brand-200",
    gradient: "from-brand-600 via-brand-700 to-accent-700",
  },
  {
    id: "institute",
    label: "Tuition institutes",
    shortLabel: "Institutes",
    icon: "users",
    blurb: "One dashboard for several teachers, branches and class series.",
    accent: "text-accent-700",
    soft: "bg-accent-100 text-accent-700",
    ring: "ring-accent-300",
    gradient: "from-accent-600 via-accent-700 to-ink-800",
  },
  {
    id: "campus",
    label: "Schools & campuses",
    shortLabel: "Schools",
    icon: "school",
    blurb: "School profiles, staff, classes, timetables and parent-ready pages.",
    accent: "text-success-600",
    soft: "bg-success-100 text-success-600",
    ring: "ring-success-500/40",
    gradient: "from-success-600 via-brand-700 to-ink-900",
  },
];

export const PLAN_AUDIENCE_MAP = Object.fromEntries(
  PLAN_AUDIENCES.map((audience) => [audience.id, audience]),
) as Record<PlanAudience, (typeof PLAN_AUDIENCES)[number]>;

export type PlanFeatureDef = {
  key: string;
  label: string;
  description: string;
  /** Plans likely to show this feature first. Purely presentational. */
  groups: PlanAudience[];
};

export const PLAN_FEATURE_GROUPS: Array<{
  id: string;
  title: string;
  description: string;
  icon: string;
  features: PlanFeatureDef[];
}> = [
  {
    id: "teaching",
    title: "Teaching & publishing",
    description: "The everyday tools for putting lessons and classes online.",
    icon: "book-open",
    features: [
      {
        key: "public_profile",
        label: "Public teacher profile",
        description: "A searchable GuruLens profile with ratings and reviews.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "basic_posts",
        label: "Posts & announcements",
        description: "Publish lessons, notices and updates to followers.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "basic_quizzes",
        label: "Quizzes",
        description: "Create auto-marked quizzes for students.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "enrollment_codes",
        label: "Enrollment codes",
        description: "Give students a code to join a class securely.",
        groups: ["teacher", "institute"],
      },
      {
        key: "voice_messages",
        label: "Voice messages",
        description: "Record short audio lessons and feedback.",
        groups: ["teacher", "institute"],
      },
      {
        key: "scheduled_posts",
        label: "Scheduled posts",
        description: "Write now and publish at the right time.",
        groups: ["teacher", "institute"],
      },
      {
        key: "class_management",
        label: "Class management",
        description: "Create class series, sessions and enrolment lists.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "attendance_tracking",
        label: "Attendance",
        description: "Mark attendance per session and see patterns.",
        groups: ["institute", "campus"],
      },
      {
        key: "timetable_management",
        label: "School timetables",
        description: "Build weekly timetables by grade, class, teacher and room.",
        groups: ["campus"],
      },
      {
        key: "grade_management",
        label: "Grades & classes",
        description: "Organise students by grade, section and class.",
        groups: ["campus"],
      },
    ],
  },
  {
    id: "growth",
    title: "Growth & insight",
    description: "Understand your audience and make better decisions.",
    icon: "chart",
    features: [
      {
        key: "advanced_analytics",
        label: "Advanced analytics",
        description: "Trends for reach, enrolments, attendance and retention.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "custom_branding",
        label: "Custom branding",
        description: "Your logo, cover and colours across your public pages.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "basic_reports",
        label: "Basic reports",
        description: "Download simple class and student reports.",
        groups: ["institute", "campus"],
      },
      {
        key: "advanced_reports",
        label: "Advanced reports",
        description: "Cross-branch reports, trends and exportable tables.",
        groups: ["institute", "campus"],
      },
      {
        key: "fee_tracking",
        label: "Fee tracking",
        description: "Keep a lightweight record of class payments.",
        groups: ["institute"],
      },
      {
        key: "data_export",
        label: "Data export",
        description: "Export students, classes and results as CSV.",
        groups: ["institute", "campus"],
      },
      {
        key: "priority_support",
        label: "Priority support",
        description: "Jump the queue when you need help.",
        groups: ["teacher", "institute", "campus"],
      },
    ],
  },
  {
    id: "team",
    title: "Teams & campuses",
    description: "For institutes and schools working together.",
    icon: "users",
    features: [
      {
        key: "multi_teacher",
        label: "Multi-teacher team",
        description: "Add teachers and staff with separate roles.",
        groups: ["institute", "campus"],
      },
      {
        key: "institute_dashboard",
        label: "Institute dashboard",
        description: "See every teacher, class and channel in one place.",
        groups: ["institute"],
      },
      {
        key: "multi_branch",
        label: "Multiple branches",
        description: "Separate classes and teams by branch location.",
        groups: ["institute", "campus"],
      },
      {
        key: "school_dashboard",
        label: "School dashboard",
        description: "A campus home built for schools.",
        groups: ["campus"],
      },
      {
        key: "school_channels",
        label: "School channels",
        description: "Official channels for notices, grades and subjects.",
        groups: ["campus"],
      },
      {
        key: "parent_portal",
        label: "Parent access",
        description: "A privacy-aware view for parents and guardians.",
        groups: ["campus"],
      },
      {
        key: "student_id_verification",
        label: "Student ID verification",
        description: "Admission and index numbers verified by the school.",
        groups: ["campus"],
      },
      {
        key: "bulk_student_import",
        label: "Bulk student import",
        description: "Add a whole class list from a CSV file.",
        groups: ["campus"],
      },
    ],
  },
  {
    id: "school",
    title: "School operations",
    description: "The bigger school workflow, from exams to notices.",
    icon: "school",
    features: [
      {
        key: "examination_management",
        label: "Examinations",
        description: "Plan exams, terms and marking schedules.",
        groups: ["campus"],
      },
      {
        key: "results_management",
        label: "Results",
        description: "Publish results to the right class or guardian.",
        groups: ["campus"],
      },
      {
        key: "clubs_societies",
        label: "Clubs & societies",
        description: "Give school clubs a page and a channel.",
        groups: ["campus"],
      },
      {
        key: "events_calendar",
        label: "Events calendar",
        description: "Term dates, sports meets and school events.",
        groups: ["campus"],
      },
      {
        key: "notice_approval",
        label: "Notice approval",
        description: "Require a second staff member to approve notices.",
        groups: ["campus"],
      },
      {
        key: "audit_logs",
        label: "Audit logs",
        description: "See who changed what and when.",
        groups: ["campus"],
      },
      {
        key: "sms_notifications",
        label: "SMS notifications",
        description: "Reach guardians by SMS when something is urgent.",
        groups: ["campus"],
      },
    ],
  },
  {
    id: "lms",
    title: "Your own LMS",
    description: "A branded learning hub on your own GuruLens subdomain.",
    icon: "school",
    features: [
      {
        key: "lms_workspace",
        label: "LMS subdomain",
        description: "A complete learning hub at yourname.gurulens.us.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "course_builder",
        label: "Course builder",
        description: "Build courses with modules and ordered lessons.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "lesson_player",
        label: "Lesson player & progress",
        description: "Video, notes and completion tracking per lesson.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "student_progress",
        label: "Student progress",
        description: "See who is enrolled, what they finished and what is next.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "course_announcements",
        label: "Course announcements",
        description: "Pin updates to every student's LMS dashboard.",
        groups: ["teacher", "institute", "campus"],
      },
      {
        key: "lms_analytics",
        label: "Learning analytics",
        description: "Enrolment, completion and engagement trends for your hub.",
        groups: ["institute", "campus"],
      },
      {
        key: "lms_certificates",
        label: "Completion certificates",
        description: "Award a shareable certificate when a course is completed.",
        groups: ["institute", "campus"],
      },
    ],
  },
  {
    id: "platform",
    title: "Platform & support",
    description: "Extra power for teams that have outgrown the basics.",
    icon: "shield-check",
    features: [
      {
        key: "api_access",
        label: "API access",
        description: "Connect your own tools to GuruLens.",
        groups: ["institute", "campus"],
      },
      {
        key: "white_label",
        label: "White label",
        description: "Use your own brand on selected surfaces.",
        groups: ["institute", "campus"],
      },
      {
        key: "custom_domain",
        label: "Custom domain",
        description: "Point your own domain at your GuruLens campus.",
        groups: ["campus"],
      },
      {
        key: "dedicated_support",
        label: "Dedicated support",
        description: "A named contact and faster response times.",
        groups: ["institute", "campus"],
      },
      {
        key: "onboarding_training",
        label: "Onboarding training",
        description: "A guided setup session for your team.",
        groups: ["institute", "campus"],
      },
      {
        key: "early_access",
        label: "Early access",
        description: "Try new GuruLens tools before everyone else.",
        groups: ["teacher", "institute", "campus"],
      },
    ],
  },
];

export const PLAN_FEATURES = PLAN_FEATURE_GROUPS.flatMap((group) => group.features);

export const PLAN_FEATURE_MAP = Object.fromEntries(
  PLAN_FEATURES.map((feature) => [feature.key, feature]),
) as Record<string, PlanFeatureDef>;

export function planFeatureLabel(key: string): string {
  if (PLAN_FEATURE_MAP[key]) return PLAN_FEATURE_MAP[key]!.label;
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function planFeatureDescription(key: string): string {
  return PLAN_FEATURE_MAP[key]?.description ?? "Custom feature added by the GuruLens team.";
}

export type PlanLimitKey =
  | "channels"
  | "classes"
  | "storage_mb"
  | "students_per_class"
  | "teachers"
  | "branches"
  | "students"
  | "grades"
  | "lms_courses"
  | "lms_lessons"
  | "lms_students";

export const PLAN_LIMITS: Array<{
  key: PlanLimitKey;
  label: string;
  shortLabel: string;
  icon: string;
  unit?: string;
  hint: string;
}> = [
  {
    key: "channels",
    label: "Channels",
    shortLabel: "channels",
    icon: "radio",
    hint: "Broadcast channels you can run",
  },
  {
    key: "classes",
    label: "Classes",
    shortLabel: "classes",
    icon: "book-open",
    hint: "Active class series",
  },
  {
    key: "storage_mb",
    label: "Media storage",
    shortLabel: "storage",
    icon: "upload",
    unit: "MB",
    hint: "Images, audio and video",
  },
  {
    key: "students_per_class",
    label: "Students per class",
    shortLabel: "students / class",
    icon: "users",
    hint: "Seats in a single class",
  },
  {
    key: "teachers",
    label: "Teacher seats",
    shortLabel: "teacher seats",
    icon: "user",
    hint: "Teacher accounts in your team",
  },
  {
    key: "branches",
    label: "Branches",
    shortLabel: "branches",
    icon: "location",
    hint: "Physical or online branches",
  },
  {
    key: "students",
    label: "Total students",
    shortLabel: "students",
    icon: "users",
    hint: "Students across the campus",
  },
  {
    key: "grades",
    label: "Grades",
    shortLabel: "grades",
    icon: "school",
    hint: "Grades you can organise",
  },
  {
    key: "lms_courses",
    label: "LMS courses",
    shortLabel: "courses",
    icon: "book-open",
    hint: "Courses in your own LMS workspace",
  },
  {
    key: "lms_lessons",
    label: "LMS lessons",
    shortLabel: "lessons",
    icon: "play",
    hint: "Lessons across all LMS courses",
  },
  {
    key: "lms_students",
    label: "LMS learners",
    shortLabel: "learners",
    icon: "users",
    hint: "Students enrolled in your LMS courses",
  },
];

export const PLAN_LIMIT_MAP = Object.fromEntries(
  PLAN_LIMITS.map((limit) => [limit.key, limit]),
) as Record<PlanLimitKey, (typeof PLAN_LIMITS)[number]>;

export function planAudience(type: string): PlanAudience {
  const value = (type || "").toLowerCase();
  if (value.includes("campus") || value.includes("school")) return "campus";
  if (value.includes("institute")) return "institute";
  return "teacher";
}

export function parsePlanLimits(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const limits: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) limits[key] = value;
    }
    return limits;
  } catch {
    return {};
  }
}

export function parsePlanFeatures(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((value): value is string => typeof value === "string"))];
  } catch {
    return [];
  }
}

export function formatPlanLimit(key: string, value: number): string {
  if (value === -1) return "Unlimited";
  if (key === "storage_mb") {
    if (value >= 1000) {
      const gb = value / 1000;
      return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
    }
    return `${value} MB`;
  }
  return value.toLocaleString("en-LK");
}

export function isFreeForNow(priceLkr: number, billingCycle: string): boolean {
  return priceLkr === 0 && billingCycle !== "lifetime";
}

export function planPriceLabel(priceLkr: number, billingCycle: string): {
  primary: string;
  suffix: string;
  note: string | null;
} {
  if (priceLkr === 0) {
    return billingCycle === "lifetime"
      ? { primary: "Free", suffix: "forever", note: null }
      : {
          primary: "Free",
          suffix: "for now",
          note: "Launch offer — pricing not finalised",
        };
  }
  const amount = `LKR ${priceLkr.toLocaleString("en-LK")}`;
  const suffix =
    billingCycle === "monthly" ? "/month" : billingCycle === "yearly" ? "/year" : "";
  return { primary: amount, suffix, note: null };
}

/** Presentational highlight; admins can still feature plans by sort order. */
export function isHighlightedPlan(slug: string): boolean {
  return ["teacher_pro", "institute", "campus_pro", "campus_elite"].includes(slug);
}

/**
 * Plans that stay free after the launch offer and are deliberately limited.
 * Everything else is "free for now" and becomes a paid plan later.
 */
export function isFreeTierPlan(slug: string): boolean {
  return ["free", "institute_starter", "campus_starter"].includes(slug);
}

export function planOfferLabel(slug: string): string | null {
  if (isFreeTierPlan(slug)) return "Free version · limited";
  return "100% off · launch offer";
}
