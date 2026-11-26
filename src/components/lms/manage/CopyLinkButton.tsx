"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icons";

/** Copy the hub URL to the clipboard with a short confirmation state. */
export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard may be blocked; fall back to a prompt-free no-op.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-ink-800"
    >
      <Icon name={copied ? "check" : "copy"} size={13} strokeWidth={copied ? 3 : 2} />
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
