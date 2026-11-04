"use client";

/**
 * Subtle floating education-themed decorations for the entire site.
 * These are positioned in corners only and are very transparent to avoid
 * interfering with content readability.
 */

interface FloatingDecorationsProps {
  /** Which variant to show - affects colors and positioning */
  variant?: "default" | "brand" | "dark";
  /** Hide decorations on smaller screens */
  hideOnMobile?: boolean;
}

export function FloatingDecorations({ 
  variant = "default",
  hideOnMobile = true 
}: FloatingDecorationsProps) {
  const baseClass = hideOnMobile ? "hidden lg:block" : "";
  
  // Different opacity and positioning based on variant
  const config = {
    default: {
      opacity: "opacity-[0.08]",
      items: [
        { emoji: "📚", pos: "top-6 left-4", delay: "0s", size: "text-4xl" },
        { emoji: "🎓", pos: "top-8 right-6", delay: "-3s", size: "text-3xl" },
        { emoji: "💡", pos: "bottom-24 left-6", delay: "-6s", size: "text-3xl" },
        { emoji: "✏️", pos: "bottom-16 right-8", delay: "-9s", size: "text-2xl" },
      ],
    },
    brand: {
      opacity: "opacity-[0.12]",
      items: [
        { emoji: "📖", pos: "top-4 left-2", delay: "0s", size: "text-3xl" },
        { emoji: "🎯", pos: "top-6 right-4", delay: "-4s", size: "text-2xl" },
        { emoji: "🌟", pos: "bottom-20 left-4", delay: "-2s", size: "text-2xl" },
        { emoji: "🍎", pos: "bottom-12 right-6", delay: "-7s", size: "text-3xl" },
      ],
    },
    dark: {
      opacity: "opacity-[0.15]",
      items: [
        { emoji: "📊", pos: "top-8 left-6", delay: "0s", size: "text-3xl" },
        { emoji: "🔬", pos: "top-12 right-8", delay: "-5s", size: "text-2xl" },
        { emoji: "📐", pos: "bottom-16 left-8", delay: "-3s", size: "text-2xl" },
        { emoji: "🧮", pos: "bottom-10 right-10", delay: "-8s", size: "text-3xl" },
      ],
    },
  };

  const { opacity, items } = config[variant];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${baseClass}`}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={`absolute animate-float-slow ${item.pos} ${item.size} ${opacity}`}
          style={{ animationDelay: item.delay }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}

/**
 * Minimal corner blobs for subtle depth effect.
 * Use this when you want decoration without emojis.
 */
export function CornerBlobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      {/* Top corners */}
      <div className="absolute -top-32 -left-32 size-64 rounded-full bg-gradient-to-br from-brand-400/10 to-transparent blur-3xl" />
      <div className="absolute -top-32 -right-32 size-64 rounded-full bg-gradient-to-bl from-accent-400/10 to-transparent blur-3xl" />
      {/* Bottom corners */}
      <div className="absolute -bottom-32 -left-32 size-64 rounded-full bg-gradient-to-tr from-brand-400/10 to-transparent blur-3xl" />
      <div className="absolute -bottom-32 -right-32 size-64 rounded-full bg-gradient-to-tl from-accent-400/10 to-transparent blur-3xl" />
    </div>
  );
}
