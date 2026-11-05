"use client";

import { useState } from "react";
import { Button, inputClass } from "./ui";

/** Free entry of short names as removable chips. */
export function TagInput({
  values,
  onChange,
  placeholder,
  label,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft("");
  };

  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input aria-label={label} className={inputClass} value={draft} maxLength={60} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          הוספה
        </Button>
      </form>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="flex items-center gap-1 rounded-full bg-lavender-soft py-1 ps-3 pe-1 text-sm">
              {v}
              <button aria-label={`הסרת ${v}`} className="size-7 rounded-full hover:bg-white" onClick={() => onChange(values.filter((x) => x !== v))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
