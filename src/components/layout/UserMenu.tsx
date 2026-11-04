"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Dropdown, MenuItem } from "@/components/ui/interactive";
import { apiFetch } from "@/lib/client";

export type HeaderUser = {
  id: string;
  name: string;
  role: string;
  avatarKey: string | null;
};

export function UserMenu({ user }: { user: HeaderUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const isTeacher = user.role === "teacher";
  const isAdmin = user.role === "admin" || user.role === "moderator";

  return (
    <Dropdown
      trigger={
        <span className="flex items-center gap-2 rounded-full p-0.5 transition-opacity hover:opacity-85">
          <Avatar
            name={user.name}
            src={user.avatarKey ? `/api/media/${user.avatarKey}` : null}
            size="sm"
          />
        </span>
      }
    >
      <div className="border-b border-ink-100 px-3 pt-1.5 pb-2.5">
        <p className="text-sm font-bold text-ink-900">{user.name}</p>
        <p className="text-xs font-medium text-ink-400 capitalize">{user.role}</p>
      </div>
      <div className="pt-1.5">
        {isTeacher ? (
          <MenuItem icon="video" href="/studio">
            Teacher Studio
          </MenuItem>
        ) : null}
        {isAdmin ? (
          <MenuItem icon="shield" href="/admin">
            Admin Console
          </MenuItem>
        ) : null}
        <MenuItem icon="grid" href="/dashboard">
          My Dashboard
        </MenuItem>
        <MenuItem icon="bookmark" href="/saved">
          Saved
        </MenuItem>
        <MenuItem icon="bell" href="/notifications">
          Notifications
        </MenuItem>
        <MenuItem icon="sliders" href="/settings">
          Settings
        </MenuItem>
        <div className="my-1 h-px bg-ink-100" />
        <MenuItem icon="logout" tone="danger" onClick={signOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </MenuItem>
      </div>
    </Dropdown>
  );
}
