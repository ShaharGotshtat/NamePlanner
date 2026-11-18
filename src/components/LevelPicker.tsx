import type { ChipLevel } from "@/lib/types";

const LEVELS: { id: ChipLevel; label: string; selected: string }[] = [
  { id: "want", label: "רצוי", selected: "bg-white text-ink shadow" },
  { id: "must", label: "חובה", selected: "bg-lavender-dark text-white shadow" },
];

/** Both levels stay visible, so the label never flips under the user's finger. */
export function LevelPicker({ label, level, onChange }: { label: string; level: ChipLevel; onChange: (level: ChipLevel) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-full bg-lavender-soft p-1">
      {LEVELS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={level === l.id}
          onClick={() => onChange(l.id)}
          className={`min-h-11 min-w-14 rounded-full px-3 text-sm transition-colors ${
            level === l.id ? `font-medium ${l.selected}` : "text-ink-soft"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
