import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/icons";
import { InfoNote } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { getChannelUsage } from "@/lib/channels";
import { CreateChannelForm } from "./create-channel-form";

export const metadata: Metadata = { title: "Create Channel" };

export default async function CreateChannelPage() {
  const auth = await getAuth();
  
  if (!auth) {
    redirect("/login?redirect=/channels/create");
  }

  const usage = await getChannelUsage(auth.user.id);
  
  if (!usage.canCreate) {
    redirect("/channels?error=limit_reached");
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-8 pb-12 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Create Channel</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Share educational content with your followers. You have{" "}
          <span className="font-bold text-brand-600">
            {usage.remaining === -1 ? "unlimited" : usage.remaining}
          </span>{" "}
          channel{usage.remaining !== 1 ? "s" : ""} remaining.
        </p>
      </div>

      <CreateChannelForm />
    </div>
  );
}
