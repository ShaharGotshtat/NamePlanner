import { checkPreferences, type PreferencesInput, withErrorId } from "./api";
import type { AppState } from "./state";

export function preferenceInput(s: AppState): PreferencesInput {
  return {
    chips: s.chips,
    texts: [s.freeText, ...s.notes].map((t) => t.trim()).filter(Boolean),
    namesWeLike: s.namesWeLike,
    family: s.family,
  };
}

const inputKey = (s: AppState) => {
  const { texts, namesWeLike, family } = preferenceInput(s);
  return JSON.stringify({ texts, namesWeLike, family });
};

export const needsCheck = (s: AppState) => inputKey(s) !== s.checkedInput;

export interface CheckResult {
  patch: Partial<AppState>;
  message: string | null;
  ok: boolean;
}

const DROP_FREE_TEXT = { freeText: "", notes: [], flagged: true };

/** Sends the free text, names and family list for the input check and parsing. */
export async function runCheck(s: AppState): Promise<CheckResult> {
  const input = preferenceInput(s);
  const { status, profile, errorId, token } = await checkPreferences(input, s.token);
  const hasText = input.texts.length > 0 || input.namesWeLike.length > 0;
  const checked = { token, checkedInput: inputKey(s) };

  switch (status) {
    case "ok":
      return { ok: true, message: null, patch: { ...checked, profile: profile ?? null } };
    case "unavailable":
      return {
        ok: true,
        message: hasText ? withErrorId("לא הצלחנו לעבד את הטקסט כרגע. ההצעות יתבססו על הבחירות שסומנו.", errorId) : null,
        patch: checked,
      };
    case "flagged":
      return {
        ok: false,
        message: "לא נוכל להשתמש בטקסט הזה. אפשר לנסח מחדש או להמשיך בלעדיו.",
        patch: { ...checked, ...DROP_FREE_TEXT, checkedInput: null },
      };
    case "disabled":
      return {
        ok: false,
        message: "הטקסט החופשי כבוי בסשן הזה. אפשר להמשיך עם הבחירות.",
        patch: { ...checked, ...DROP_FREE_TEXT, freeTextDisabled: true, checkedInput: null },
      };
  }
}
