"use client";

import { useId, useState } from "react";
import { APP_NAME } from "@/lib/constants";

export type MascotMood = "happy" | "cheer" | "cloud" | "idea" | "detective" | "neutral" | "hopeful" | "sad" | "surprised";

/** The three ways the sun can look while it thinks or searches. */
export const THINKING_MOODS = ["cloud", "idea", "detective"] as const satisfies readonly MascotMood[];

/** Picks one thinking sun at random, and keeps it for as long as the component stays on screen. */
function useRandomThinkingMood(): MascotMood {
  const [mood] = useState(() => THINKING_MOODS[Math.floor(Math.random() * THINKING_MOODS.length)]);
  return mood;
}

const INK = "#3a3560";
const ROSE = "#f7a9a8";
const LAVENDER = "#a6b8f0";
const SUN = "#ffcf70";
const BLUSH = "#e27c7c";
const SUN_EDGE = "#f0b442";
const LILAC = "#c4aee8";
const LILAC_SOFT = "#f2ebfb";
const LILAC_DARK = "#7a63b8";
const TWEED = "#c99a6b";
const TWEED_DARK = "#9b6f47";
const TWEED_BRIM = "#b5855a";
const HANDLE = "#7a5236";

const RAYS = [
  [138, 95, 150, 95],
  [121.01, 136.01, 129.5, 144.5],
  [80, 153, 80, 165],
  [38.99, 136.01, 30.5, 144.5],
  [22, 95, 10, 95],
  [38.99, 53.99, 30.5, 45.5],
  [80, 37, 80, 25],
  [121.01, 53.99, 129.5, 45.5],
];

const LABELS: Record<MascotMood, string> = {
  happy: "שמש קטנה ומחייכת",
  cheer: "שמש קטנה ושמחה מאוד",
  cloud: "שמש קטנה עם ענן מחשבה",
  idea: "שמש קטנה עם רעיון",
  detective: "שמש בלשית שמחפשת שמות",
  neutral: "שמש קטנה שמקבלת את ההחלטה",
  hopeful: "שמש קטנה עם עיניים נוצצות של תקווה",
  sad: "שמש קטנה ועצובה",
  surprised: "שמש קטנה ומופתעת",
};

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === "cheer") {
    return (
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M56 90 Q62 82 68 90" />
        <path d="M92 90 Q98 82 104 90" />
      </g>
    );
  }
  if (mood === "surprised") {
    return (
      <g>
        <circle cx="62" cy="88" r="9" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="98" cy="88" r="9" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="62" cy="88" r="4" fill={INK} />
        <circle cx="98" cy="88" r="4" fill={INK} />
      </g>
    );
  }
  if (mood === "idea") {
    return (
      <g stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M56 90 Q62 82 68 90" />
        <path d="M92 90 Q98 82 104 90" />
      </g>
    );
  }
  if (mood === "detective") {
    return (
      <g fill={INK}>
        <ellipse cx="60" cy="90" rx="6.5" ry="8" />
        <circle cx="62" cy="87" r="2.4" fill="#fff" />
      </g>
    );
  }
  if (mood === "hopeful") {
    return (
      <g>
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M54 75 Q60 70 68 73" />
          <path d="M106 75 Q100 70 92 73" />
        </g>
        <g fill={INK}>
          <ellipse cx="62" cy="88" rx="8" ry="9.5" />
          <ellipse cx="98" cy="88" rx="8" ry="9.5" />
        </g>
        <g fill="#fff">
          <path d="M65 79.5 Q65 84 69.5 84 Q65 84 65 88.5 Q65 84 60.5 84 Q65 84 65 79.5Z" />
          <path d="M101 79.5 Q101 84 105.5 84 Q101 84 101 88.5 Q101 84 96.5 84 Q101 84 101 79.5Z" />
          <circle cx="59" cy="93" r="1.6" />
          <circle cx="95" cy="93" r="1.6" />
        </g>
      </g>
    );
  }
  if (mood === "cloud") {
    return (
      <g fill={INK}>
        <ellipse cx="63" cy="88" rx="6.5" ry="8" />
        <ellipse cx="99" cy="88" rx="6.5" ry="8" />
        <circle cx="66" cy="84" r="2.6" fill="#fff" />
        <circle cx="102" cy="84" r="2.6" fill="#fff" />
      </g>
    );
  }
  const y = mood === "sad" ? 91 : 89;
  const glint = -3;
  return (
    <g fill={INK}>
      <ellipse cx="62" cy={y} rx="6.5" ry="8" />
      <ellipse cx="98" cy={y} rx="6.5" ry="8" />
      <circle cx="64" cy={y + glint} r="2.4" fill="#fff" />
      <circle cx="100" cy={y + glint} r="2.4" fill="#fff" />
      {mood === "sad" && (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M53 79 L67 75" />
          <path d="M107 79 L93 75" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  switch (mood) {
    case "cheer":
      return (
        <g>
          <path d="M68 102 Q80 120 92 102 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M74 110 Q80 115 86 110" fill="#b84a57" />
        </g>
      );
    case "detective":
      return <path d="M66 106 Q76 116 86 106" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case "sad":
      return <path d="M72 110 Q80 103 88 110" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case "hopeful":
      return <path d="M75 108 Q80 109 85 108" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case "neutral":
      return <path d="M73 107 H87" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
    case "surprised":
      return <ellipse cx="80" cy="109" rx="5" ry="6.5" fill={INK} />;
    default:
      return <path d="M71 104 Q80 115 89 104 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
  }
}

const CLOUD_PUFFS: [number, number, number][] = [
  [108, 25, 9], [121, 16, 11], [136, 13, 11.5], [150, 21, 9], [143, 30, 8], [128, 30, 9], [114, 31, 7], [130, 23, 11],
];
const CLOUD_BUBBLES: [number, number, number][] = [
  [110, 46, 3.6],
  [103, 54, 2.2],
];

function ThoughtCloud() {
  const circles = (grow: number) =>
    [...CLOUD_PUFFS, ...CLOUD_BUBBLES].map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r + grow} />);
  return (
    <g>
      <g fill={LILAC}>{circles(1.5)}</g>
      <g fill={LILAC_SOFT}>{circles(0)}</g>
      <text x="129" y="29" textAnchor="middle" fontFamily="Fredoka, Rubik, sans-serif" fontWeight="600" fontSize="20" fill={LILAC_DARK}>
        ?
      </text>
    </g>
  );
}

function Lightbulb() {
  return (
    <g>
      <g transform="translate(118 2)">
        <path
          d="M17 4 A13 13 0 0 1 26 27 Q23 30 23 34 H11 Q11 30 8 27 A13 13 0 0 1 17 4 Z"
          fill="#fff6c9"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <rect x="11" y="35" width="12" height="7" rx="2" fill={LAVENDER} stroke={INK} strokeWidth="2" />
        <path d="M13 22 Q17 15 21 22" stroke={SUN_EDGE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
      <g stroke={SUN_EDGE} strokeWidth="2.5" strokeLinecap="round">
        <path d="M110 8 L114 12" />
        <path d="M108 22 H113" />
        <path d="M152 18 H157" />
      </g>
    </g>
  );
}

function DetectiveHat() {
  const clip = useId();
  const crown = "M42 64 Q44 22 80 20 Q116 22 118 64 Z";
  return (
    <g>
      <clipPath id={clip}>
        <path d={crown} />
      </clipPath>
      <path d={crown} fill={TWEED} />
      <g clipPath={`url(#${clip})`} stroke={TWEED_DARK} strokeWidth="2.5" opacity="0.8">
        <path d="M40 34 H120 M40 48 H120 M60 15 V70 M80 15 V70 M100 15 V70" />
      </g>
      <path d="M44 60 Q24 60 16 68 Q38 74 62 64 Z" fill={TWEED_BRIM} />
      <path d="M116 60 Q136 60 144 68 Q122 74 98 64 Z" fill={TWEED_BRIM} />
      <path d="M44 62 Q80 70 116 62" stroke={ROSE} strokeWidth="6" fill="none" strokeLinecap="round" />
      <g fill={TWEED_DARK}>
        <ellipse cx="73" cy="20" rx="7" ry="4" />
        <ellipse cx="87" cy="20" rx="7" ry="4" />
        <circle cx="80" cy="20" r="3.5" />
      </g>
    </g>
  );
}

/** The magnifying glass covers the right eye, which looks bigger through the lens. */
function MagnifyingGlass() {
  return (
    <g>
      <path d="M111 103 L132 128" stroke={HANDLE} strokeWidth="8" strokeLinecap="round" />
      <circle cx="99" cy="91" r="17" fill="#dff4fb" fillOpacity="0.55" stroke={INK} strokeWidth="4" />
      <ellipse cx="99" cy="91" rx="9" ry="11" fill={INK} />
      <circle cx="102" cy="86" r="3.4" fill="#fff" />
      <path d="M88 84 Q91 78 97 77" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  );
}

/**
 * The app's companion and logo: a sun made of two halves, one per parent, that meet in one smile.
 * The mood changes its face to react to what the user does.
 */
export function Mascot({ mood = "happy", size = 140, className = "" }: { mood?: MascotMood; size?: number; className?: string }) {
  const cheek = mood === "sad" ? 0.3 : mood === "neutral" ? 0.4 : mood === "cheer" ? 0.7 : mood === "idea" || mood === "hopeful" ? 0.65 : 0.5;
  return (
    <svg
      viewBox="0 0 160 170"
      width={size}
      height={size * (170 / 160)}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={LABELS[mood]}
    >
      <g stroke={SUN} strokeWidth="12" strokeLinecap="round">
        {RAYS.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <path d="M80 47 A48 48 0 0 0 80 143 Z" fill={ROSE} />
      <path d="M80 47 A48 48 0 0 1 80 143 Z" fill={LAVENDER} />

      <ellipse cx="54" cy="106" rx="8" ry="5.5" fill={BLUSH} opacity={cheek} />
      <ellipse cx="106" cy="106" rx="8" ry="5.5" fill={BLUSH} opacity={cheek} />

      {mood === "detective" && <DetectiveHat />}
      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === "detective" && <MagnifyingGlass />}
      {mood === "idea" && <Lightbulb />}
      {mood === "cloud" && <ThoughtCloud />}
      {mood === "hopeful" && (
        <g fill={SUN} stroke={SUN_EDGE} strokeWidth="1.2">
          <path d="M124 29 Q124 36 131 36 Q124 36 124 43 Q124 36 117 36 Q124 36 124 29Z" />
          <path d="M36 35 Q36 40 41 40 Q36 40 36 45 Q36 40 31 40 Q36 40 36 35Z" />
        </g>
      )}
    </svg>
  );
}

/** The wordmark: the sun with the Hebrew name, as used in the header. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <Mascot size={size} className="-my-1" />
      <span className="font-display text-xl font-semibold">{APP_NAME}</span>
    </span>
  );
}

/** Mascot with a short speech bubble beside it. Re-keying it on a new line replays the pop-in. */
export function MascotSays({
  mood,
  children,
  size = 56,
  className = "",
}: {
  mood: MascotMood;
  children: React.ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="status">
      <Mascot mood={mood} size={size} className="animate-mascot-pop" />
      <p className="relative rounded-2xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-line">{children}</p>
    </div>
  );
}

/** A thinking sun picked at random each time it appears. */
export function ThinkingMascot(props: { size?: number; className?: string }) {
  return <Mascot mood={useRandomThinkingMood()} {...props} />;
}

/** A random thinking sun with a speech bubble. */
export function ThinkingMascotSays(props: { children: React.ReactNode; size?: number; className?: string }) {
  return <MascotSays mood={useRandomThinkingMood()} {...props} />;
}
