"use client";

import { useState } from "react";
import { useApp } from "@/lib/client/state";
import type { Relation } from "@/lib/types";
import { Button, inputClass, ScreenTitle } from "../ui";

export const RELATIONS: Record<Relation, string> = {
  sibling: "אח או אחות של התינוק",
  cousin: "בן או בת דודים",
  parent: "הורה",
  grandparent: "סבא או סבתא",
  other: "אחר",
};

export function Family() {
  const { state, update } = useApp();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("sibling");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update((s) => ({ family: [...s.family, { name: trimmed, relation }] }));
    setName("");
  };

  return (
    <div>
      <ScreenTitle subtitle="לא נציע שמות שכבר תפוסים. שמות האחים גם יעזרו לנו להבין מה אתם אוהבים. הרשימה לא חייבת להיות מלאה.">
        אילו שמות כבר תפוסים במשפחה הקרובה?
      </ScreenTitle>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input aria-label="שם" className={inputClass} value={name} maxLength={60} placeholder="שם" onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <select aria-label="קרבה" className={inputClass} value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
            {Object.entries(RELATIONS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" disabled={!name.trim()}>
            הוספה
          </Button>
        </div>
      </form>

      {state.family.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {state.family.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-white py-1 ps-3 pe-1 text-sm ring-1 ring-line">
              <span className="font-medium">{f.name}</span>
              <span className="text-ink-soft">· {RELATIONS[f.relation]}</span>
              <button
                aria-label={`הסרת ${f.name}`}
                className="size-7 rounded-full hover:bg-blush"
                onClick={() => update((s) => ({ family: s.family.filter((_, j) => j !== i) }))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-8 block">
        <span className="mb-2 block font-medium">
          שם משפחה <span className="text-sm font-normal text-ink-soft">(לא חובה, כדי לבדוק שהשם זורם איתו)</span>
        </span>
        <input className={inputClass} value={state.surname} maxLength={60} onChange={(e) => update({ surname: e.target.value })} />
      </label>

      <Button className="mt-8 w-full" onClick={() => update({ step: "preferences" })}>
        המשך
      </Button>
    </div>
  );
}
