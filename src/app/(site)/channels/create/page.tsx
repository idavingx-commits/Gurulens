/**
 * Create Channel Page
 */

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getChannelUsage } from "@/lib/channels";
import { CreateChannelForm } from "./create-channel-form";

export const metadata = {
  title: "Create Channel | GuruLens",
  description: "Create a new educational channel to share content with your followers",
};

export default async function CreateChannelPage() {
  const auth = await getAuth();
  
  if (!auth) {
    redirect("/login?redirect=/channels/create");
  }

  // Check if user can create channels
  const usage = await getChannelUsage(auth.user.id);
  
  if (!usage.canCreate) {
    redirect("/channels?error=limit_reached");
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Channel</h1>
        <p className="text-muted-foreground">
          Create a channel to share educational content with your followers.
          You have {usage.remaining === -1 ? "unlimited" : usage.remaining} channel
          {usage.remaining !== 1 ? "s" : ""} remaining.
        </p>
      </div>

      <CreateChannelForm userId={auth.user.id} />
    </div>
  );
}
