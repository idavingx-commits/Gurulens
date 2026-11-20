"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { apiFetch } from "@/lib/client";

export function FollowButton({
  channelSlug,
  initialFollowing,
}: {
  channelSlug: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const data = await apiFetch<{ following: boolean }>(`/api/channels/${channelSlug}/follow`, {
        method: "POST",
      });
      setFollowing(data.following);
    } catch {
      // ignore
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      onClick={toggle}
      disabled={pending}
      variant={following ? "outline" : "primary"}
      size="sm"
    >
      {pending ? (
        <Icon name="loader" size={16} className="animate-spin" />
      ) : following ? (
        <>
          <Icon name="check" size={16} /> Following
        </>
      ) : (
        <>
          <Icon name="plus" size={16} /> Follow
        </>
      )}
    </Button>
  );
}
