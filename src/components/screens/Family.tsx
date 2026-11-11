"use client";

import { useState } from "react";
import { parseNameList } from "@/lib/name-list";
import { useApp } from "@/lib/client/state";
import type { FamilyName } from "@/lib/types";
import { Button, inputClass, ScreenTitle } from "../ui";

type ListRelation = "parent" | "sibling";

const namesOf = (family: FamilyName[], relation: ListRelation) =>
  family.filter((f) => f.relation === relation).map((f) => f.name).join(", ");

export function Family() {
  const { state, update } = useApp();
  // Raw text per field, so separators the parent is still typing are not swallowed by the parser.
  const [drafts, setDrafts] = useState<Record<ListRelation, string>>(() => ({
    parent: namesOf(state.family, "parent"),
    sibling: namesOf(state.family, "sibling"),
  }));

  const setList = (relation: ListRelation, text: string) => {
    setDrafts((d) => ({ ...d, [relation]: text }));
    const names = parseNameList(text).map((name) => ({ name, relation }));
    update((s) => ({ family: [...s.family.filter((f) => f.relation !== relation), ...names] }));
  };

  const others = state.family.filter((f) => f.relation !== "parent" && f.relation !== "sibling");

  return (
    <div>
      <ScreenTitle mood="cloud" subtitle="לא נציע שמות שכבר תפוסים, ושמות האחים יעזרו לנו להבין את הטעם שלכם. אפשר להשאיר ריק.">
        אילו שמות כבר תפוסים במשפחה?
      </ScreenTitle>

      <NameListField
        label="שמות ההורים"
        placeholder="למשל: דנה ויואב"
        value={drafts.parent}
        names={parseNameList(drafts.parent)}
        onChange={(text) => setList("parent", text)}
      />
      <NameListField
        label="שמות האחים והאחיות"
        placeholder="למשל: נועה, איתי"
        value={drafts.sibling}
        names={parseNameList(drafts.sibling)}
        onChange={(text) => setList("sibling", text)}
      />
      <p className="mt-2 text-sm text-ink-soft">אפשר להפריד בפסיק, ברווח, ב״ו״ או בשורה חדשה. שמות נוספים מהמשפחה תוכלו לסמן כ״תפוס״ כשנציע אותם.</p>

      {others.length > 0 && (
        <p className="mt-3 text-sm text-ink-soft">סימנתם כתפוסים בסבבים: {others.map((f) => f.name).join(", ")}</p>
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

function NameListField({
  label,
  placeholder,
  value,
  names,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  names: string[];
  onChange: (text: string) => void;
}) {
  return (
    <label className="mt-5 block first-of-type:mt-0">
      <span className="mb-2 block font-medium">{label}</span>
      <textarea
        className={`${inputClass} min-h-14 py-2`}
        rows={2}
        maxLength={300}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {names.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1.5" aria-label={`זיהינו: ${names.join(", ")}`}>
          {names.map((n) => (
            <span key={n} className="rounded-full bg-lavender-soft px-3 py-0.5 text-sm">
              {n}
            </span>
          ))}
        </span>
      )}
    </label>
  );
}
