import { UsersTable, type UserRow } from "@/components/admin/UsersTable";
import { Icon } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/primitives";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [user, { q }] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) return null;

  const query = q?.trim() ?? "";
  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { teacherProfile: { is: { handle: { contains: query, mode: "insensitive" } } } },
        ],
      }
    : {};

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarKey: true,
      createdAt: true,
      teacherProfile: { select: { handle: true } },
    },
  });

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    avatarKey: u.avatarKey,
    createdAt: u.createdAt.toISOString(),
    handle: u.teacherProfile?.handle ?? null,
  }));

  return (
    <div>
      <SectionHeader
        title="Users"
        subtitle={query ? `${rows.length} result${rows.length === 1 ? "" : "s"} for “${query}”` : "Latest 50 accounts"}
      />

      <form method="get" className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={15}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-300"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by name, email or teacher handle…"
            className="w-full rounded-2xl border border-ink-200 bg-white/70 py-2.5 pr-4 pl-10 text-[13.5px] font-medium text-ink-800 placeholder:text-ink-300 focus:border-brand-400 focus:bg-white focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-2xl border border-ink-200 bg-white/70 px-4 text-[13px] font-bold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          Search
        </button>
      </form>

      <UsersTable rows={rows} viewerRole={user.role} />
    </div>
  );
}
