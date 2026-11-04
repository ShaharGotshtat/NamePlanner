export type MascotMood = "happy" | "cheer" | "think" | "sad" | "surprised";

const INK = "#23214f";

const LABELS: Record<MascotMood, string> = {
  happy: "דמות קטנה ומחייכת",
  cheer: "דמות קטנה ושמחה מאוד",
  think: "דמות קטנה שחושבת",
  sad: "דמות קטנה ועצובה",
  surprised: "דמות קטנה ומופתעת",
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
          <path d="M74 110 Q80 115 86 110" fill="#e8553f" />
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
 * The app's companion: a little bean with a sprout, holding a blank name tag.
 * Pure SVG in the theme palette; the mood changes its face to react to what the user does.
 */
export function Mascot({ mood = "happy", size = 140, className = "" }: { mood?: MascotMood; size?: number; className?: string }) {
  const droop = mood === "sad";
  return (
    <svg
      viewBox="0 0 160 170"
      width={size}
      height={size * (170 / 160)}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={LABELS[mood]}
    >
      <ellipse cx="80" cy="160" rx="42" ry="6" fill={INK} opacity="0.08" />

      {/* sprout; droops when sad */}
      <g transform={droop ? "rotate(28 80 42)" : undefined}>
        <path d="M80 42 C80 32 80 26 82 18" stroke="#1e8c7e" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M82 22 C70 10 56 14 54 22 C64 28 76 28 82 22Z" fill="#1e8c7e" />
        <path d="M82 20 C92 6 108 8 110 16 C100 24 88 24 82 20Z" fill="#3fb3a2" />
      </g>

      <path d="M80 40 C116 40 134 72 134 104 C134 136 110 154 80 154 C50 154 26 136 26 104 C26 72 44 40 80 40Z" fill="#f6a08e" />
      <path
        d="M80 40 C116 40 134 72 134 104 C134 112 132 120 128 126 C120 92 104 62 70 48 C73 42 76 40 80 40Z"
        fill="#fff"
        opacity="0.18"
      />

      <ellipse cx="50" cy="104" rx="9" ry="6" fill="#e8553f" opacity={mood === "sad" ? 0.15 : mood === "cheer" ? 0.5 : 0.35} />
      <ellipse cx="110" cy="104" rx="9" ry="6" fill="#e8553f" opacity={mood === "sad" ? 0.15 : mood === "cheer" ? 0.5 : 0.35} />

      <Eyes mood={mood} />
      <Mouth mood={mood} />
      {mood === "sad" && <path d="M48 98 Q44 106 48 110 Q52 106 48 98Z" fill="#7cc7e8" />}

      <g transform="rotate(-6 80 132)">
        <rect x="56" y="118" width="48" height="28" rx="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <circle cx="62" cy="132" r="2.2" fill="#e8553f" />
        <path d="M70 128 H96 M70 136 H88" stroke="#f1dcd3" strokeWidth="3" strokeLinecap="round" />
      </g>

      <ellipse cx="56" cy="133" rx="7" ry="6" fill="#f08d79" />
      <ellipse cx="104" cy="129" rx="7" ry="6" fill="#f08d79" />
    </svg>
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
