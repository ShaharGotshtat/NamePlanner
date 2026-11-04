type Mood = "happy" | "cheer" | "think";

/**
 * The app's companion: a little bean with a sprout, holding a blank name tag.
 * Pure SVG in the theme palette, so it can reappear on any step with a different mood.
 */
export function Mascot({ mood = "happy", size = 140, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 170"
      width={size}
      height={size * (170 / 160)}
      className={className}
      role="img"
      aria-label="דמות קטנה ומחייכת שמחזיקה תגית שם"
    >
      {/* shadow */}
      <ellipse cx="80" cy="160" rx="42" ry="6" fill="#23214f" opacity="0.08" />

      {/* sprout */}
      <path d="M80 42 C80 32 80 26 82 18" stroke="#1e8c7e" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M82 22 C70 10 56 14 54 22 C64 28 76 28 82 22Z" fill="#1e8c7e" />
      <path d="M82 20 C92 6 108 8 110 16 C100 24 88 24 82 20Z" fill="#3fb3a2" />

      {/* body */}
      <path
        d="M80 40 C116 40 134 72 134 104 C134 136 110 154 80 154 C50 154 26 136 26 104 C26 72 44 40 80 40Z"
        fill="#f6a08e"
      />
      <path
        d="M80 40 C116 40 134 72 134 104 C134 112 132 120 128 126 C120 92 104 62 70 48 C73 42 76 40 80 40Z"
        fill="#ffffff"
        opacity="0.18"
      />

      {/* cheeks */}
      <ellipse cx="50" cy="104" rx="9" ry="6" fill="#e8553f" opacity="0.35" />
      <ellipse cx="110" cy="104" rx="9" ry="6" fill="#e8553f" opacity="0.35" />

      {/* eyes */}
      {mood === "cheer" ? (
        <g stroke="#23214f" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M56 90 Q62 82 68 90" />
          <path d="M92 90 Q98 82 104 90" />
        </g>
      ) : (
        <g fill="#23214f">
          <ellipse cx="62" cy={mood === "think" ? 86 : 89} rx="6.5" ry="8" />
          <ellipse cx="98" cy={mood === "think" ? 86 : 89} rx="6.5" ry="8" />
          <circle cx={mood === "think" ? 64 : 64.5} cy={mood === "think" ? 82 : 86} r="2.4" fill="#fff" />
          <circle cx={mood === "think" ? 100 : 100.5} cy={mood === "think" ? 82 : 86} r="2.4" fill="#fff" />
        </g>
      )}

      {/* mouth */}
      {mood === "think" ? (
        <path d="M74 108 Q80 106 86 108" stroke="#23214f" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M71 104 Q80 115 89 104 Z" fill="#23214f" stroke="#23214f" strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* name tag held in front */}
      <g transform="rotate(-6 80 132)">
        <rect x="56" y="118" width="48" height="28" rx="6" fill="#fff" stroke="#23214f" strokeWidth="2.5" />
        <circle cx="62" cy="132" r="2.2" fill="#e8553f" />
        <path d="M70 128 H96 M70 136 H88" stroke="#f1dcd3" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* hands */}
      <ellipse cx="56" cy="133" rx="7" ry="6" fill="#f08d79" />
      <ellipse cx="104" cy="129" rx="7" ry="6" fill="#f08d79" />
    </svg>
  );
}
