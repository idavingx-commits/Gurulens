import type { ReactNode, SVGProps } from "react";

const P: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m20.5 20.5-4.2-4.2" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.75 12 3l9 7.75" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  star: (
    <path
      d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.8z"
      fill="currentColor"
      stroke="none"
    />
  ),
  "star-outline": (
    <path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.4l5.9-.8z" />
  ),
  check: <path d="M4.5 12.5 10 18 19.5 6.5" />,
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.6-3.8 4.5-5.5 7.5-5.5s5.9 1.7 7.5 5.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c1.3-3.4 3.8-5 6.5-5s5.2 1.6 6.5 5" />
      <path d="M16 5.5a3.2 3.2 0 1 1 0 6.4" />
      <path d="M17.5 15.4c1.7.6 3.1 2 4 4.6" />
    </>
  ),
  play: <path d="M8 5.2v13.6L19 12z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="m16 10.5 5-3v9l-5-3" />
    </>
  ),
  film: (
    <>
      <rect x="4" y="3.5" width="16" height="17" rx="3" />
      <path d="M8 3.5v17M16 3.5v17M4 9h16M4 15h16" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  heart: (
    <path d="M12 20.5S4.5 16 2.8 11.4C1.5 7.9 3.6 5 6.7 5c2 0 3.6 1.1 5.3 3.1C13.7 6.1 15.3 5 17.3 5c3.1 0 5.2 2.9 3.9 6.4C19.5 16 12 20.5 12 20.5z" />
  ),
  bookmark: <path d="M6.5 3.5h11v17l-5.5-3.7-5.5 3.7z" />,
  share: (
    <>
      <path d="M12 3v11" />
      <path d="m8 6.5 4-3.5 4 3.5" />
      <path d="M5 12v8h14v-8" />
    </>
  ),
  flag: (
    <>
      <path d="M5.5 21V4.5" />
      <path d="M5.5 5c4.5-2.4 8.5 2 13.5-.4v9.8c-5 2.4-9-2-13.5.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4.5" />
      <path d="m7.5 9 4.5-4.5L16.5 9" />
      <path d="M4.5 20h15" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  pencil: (
    <>
      <path d="m4.5 19.5 4.2-1L19.4 7.8a2 2 0 0 0-2.8-2.8L5.9 15.7z" />
      <path d="m14.5 7 2.8 2.8" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="m6.5 7 .9 13.5h9.2L17.5 7" />
      <path d="M10.5 11v6M13.5 11v6" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 4H5v16h4.5" />
      <path d="m15.5 8 4 4-4 4" />
      <path d="M19.5 12H10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.7c0 4.7 3.3 7.7 7 9 3.7-1.3 7-4.3 7-9V5.8z" />
      <path d="m9 11.8 2.2 2.2 4-4.2" />
    </>
  ),
  "shield-check": (
    <>
      <path d="M12 3 5 5.8v5.7c0 4.7 3.3 7.7 7 9 3.7-1.3 7-4.3 7-9V5.8z" />
      <path d="m9 11.8 2.2 2.2 4-4.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-5M12 16V7M17 16v-8" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15.5H7A2.5 2.5 0 0 0 4.5 21z" />
      <path d="M4.5 18.5A2.5 2.5 0 0 1 7 16h12.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4.5 13.6 9l4.4 1.6-4.4 1.6L12 16.5l-1.6-4.3L6 10.6 10.4 9z" />
      <path d="M19 15.5v4M17 17.5h4" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.2v5.6l-3.6 1.8v-7.4z" />,
  "arrow-right": (
    <>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 10.5 13.5" />
      <path d="M19 13.5v6H4.5V5h6" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="m5.5 18 4.5-4.5 3 3 3-2.5 3.5 3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.5h.01" />
    </>
  ),
  location: (
    <>
      <path d="M12 21s6.8-6 6.8-11a6.8 6.8 0 1 0-13.6 0C5.2 15 12 21 12 21z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </>
  ),
  phone: (
    <path d="M6.8 3.5 9 7.6l-1.8 2.2a12.5 12.5 0 0 0 7 7L16.4 15l4.1 2.2-.6 2.3c-.2.8-1 1.4-1.9 1.3C10.5 20 4 13.5 3.2 6c-.1-.9.5-1.7 1.3-1.9z" />
  ),
  message: (
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5V16h-1A2.5 2.5 0 0 1 4 13.5z" />
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9.9-.9 1.7" />
      <path d="M12 17h.01" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  key: (
    <>
      <path d="M15.5 8.5a3.5 3.5 0 1 1 3.5 3.5c-.6 0-1.2-.2-1.7-.4L12 17H9.5v2.5H7V22H4.5v-3.5l7-7A5.4 5.4 0 0 1 15.5 8.5z" transform="translate(-1.5 -1.5) scale(0.94)" />
      <circle cx="16.2" cy="7.8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  refresh: (
    <>
      <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6l3 2.8" />
      <path d="M21 4.5V9h-4.5" />
      <path d="M20.5 12a8.5 8.5 0 0 1-14.5 6l-3-2.8" />
      <path d="M3 19.5V15h4.5" />
    </>
  ),
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.8 4.7a3.8 3.8 0 0 1 5.4 5.4L16.4 12" />
      <path d="M13 17.5l-1.8 1.8a3.8 3.8 0 0 1-5.4-5.4L7.6 12" />
    </>
  ),
  crown: <path d="M4 17.5h16M4 17.5 3 8l5 4 4-6.5L16 12l5-4-1 9.5" />,
  zap: <path d="M13 2.5 4.5 14H11l-1 7.5L18.5 10H12z" />,
  fire: (
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-2.6 1.6-4.6 3.2-6.3.6 1 1.3 1.7 2.3 2.2C11 8.2 12 5.5 12 3c3 2.3 6.5 6.2 6.5 11.3C18.5 18.1 16 21 12 21z" />
  ),
  send: (
    <>
      <path d="M21 3.5 10.5 14" />
      <path d="M21 3.5 14.5 21l-4-7-7-4z" />
    </>
  ),
  volume: (
    <>
      <path d="M4.5 9.5v5H8l4.5 3.5v-12L8 9.5z" />
      <path d="M15.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  mute: (
    <>
      <path d="M4.5 9.5v5H8l4.5 3.5v-12L8 9.5z" />
      <path d="m15 9.5 4 5M19 9.5l-4 5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M5.5 15.5H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5V16" />
      <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 20h15" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  list: (
    <>
      <path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </>
  ),
  "panel-left": (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.8 13.5-1.3 7 4.5-2.6 4.5 2.6-1.3-7" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  "rotate-ccw": (
    <>
      <path d="M4.5 5v5h5" />
      <path d="M5 10a7.5 7.5 0 1 1 2 5.5" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
  ...rest
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, "name" | "width" | "height" | "className">) {
  const content = P[name] ?? P.help;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {content}
    </svg>
  );
}
