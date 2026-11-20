"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";

interface FollowButtonProps {
  channelSlug: string;
  initialFollowing: boolean;
}

export function FollowButton({ channelSlug, initialFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFollow = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/channels/${channelSlug}/follow`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update follow status");
      }

      setIsFollowing(data.following);
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={isLoading}
      variant={isFollowing ? "outline" : "primary"}
      size="sm"
    >
      {isFollowing ? (
        <>
          <Icon name="user-minus" size={16} />
          Unfollow
        </>
      ) : (
        <>
          <Icon name="user-plus" size={16} />
          Follow
        </>
      )}
    </Button>
  );
}
