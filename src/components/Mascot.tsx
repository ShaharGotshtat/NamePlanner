import { APP_NAME } from "@/lib/constants";

export type MascotMood = "happy" | "cheer" | "think" | "sad" | "surprised";

const INK = "#3a3560";
const ROSE = "#f7a9a8";
const LAVENDER = "#a6b8f0";
const SUN = "#ffcf70";
const BLUSH = "#e27c7c";

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
  think: "שמש קטנה שחושבת",
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
  const y = mood === "think" ? 86 : mood === "sad" ? 92 : 89;
  const glint = mood === "think" ? -4 : -3;
  return (
    <g fill={INK}>
      <ellipse cx="62" cy={y} rx="6.5" ry="8" />
      <ellipse cx="98" cy={y} rx="6.5" ry="8" />
      <circle cx="64" cy={y + glint} r="2.4" fill="#fff" />
      <circle cx="100" cy={y + glint} r="2.4" fill="#fff" />
      {mood === "sad" && (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M52 80 L67 74" />
          <path d="M108 80 L93 74" />
        </g>
      )}
      {mood === "think" && <path d="M90 74 L106 72" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
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
    case "think":
      return <path d="M74 108 Q80 106 86 108" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case "sad":
      return <path d="M71 110 Q80 101 89 110" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />;
    case "surprised":
      return <ellipse cx="80" cy="109" rx="5" ry="6.5" fill={INK} />;
    default:
      return <path d="M71 104 Q80 115 89 104 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
  }
}

/**
 * The app's companion and logo: a sun made of two halves, one per parent, that meet in one smile.
 * The mood changes its face to react to what the user does.
 */
export function Mascot({ mood = "happy", size = 140, className = "" }: { mood?: MascotMood; size?: number; className?: string }) {
  const cheek = mood === "sad" ? 0.2 : mood === "cheer" ? 0.7 : 0.5;
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

      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === "sad" && <path d="M54 98 Q50 106 54 110 Q58 106 54 98Z" fill="#7cc7e8" />}
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
