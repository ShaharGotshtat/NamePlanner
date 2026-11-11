import { z } from "zod";
import { CHIP_IDS } from "@/lib/engine/chips";

const shortText = z.string().trim().max(60);

const familyName = z.object({
  name: shortText.min(1),
  relation: z.enum(["sibling", "cousin", "parent", "grandparent", "other"]),
});

const chips = z.partialRecord(z.enum(CHIP_IDS), z.enum(["want", "must"]));

export const MEANING_CATEGORIES = [
  "nature", "light", "strength", "joy", "faith", "love", "beauty", "peace", "wisdom", "gift", "royalty", "life", "biblical",
] as const;
export const ORIGINS = ["hebrew", "aramaic", "arabic", "greek", "latin", "persian", "yiddish", "english", "other"] as const;
export const STYLES = ["traditional", "classic", "modern"] as const;
export const LENGTHS = ["short", "long"] as const;
export const POPULARITY = ["common", "rare", "veryRare"] as const;
export const FACETS = ["meaningCategory", "origin", "style", "length", "ending", "popularity"] as const;

const textRequirement = z.object({
  id: z.string().max(40),
  label: z.string().max(120),
  kind: z.enum(["want", "avoid"]),
  facet: z.enum(FACETS),
  values: z.array(z.string().max(20)).max(12),
});

const profile = z.object({
  summary: z.string().max(300),
  requirements: z.array(textRequirement).max(20),
  sig: z.string().max(100).optional(),
});

export const roundRequestSchema = z.object({
  babySex: z.enum(["boy", "girl", "unknown"]),
  dueDerived: z
    .object({
      hebrewMonth: shortText,
      holiday: shortText.nullable(),
      zodiac: shortText,
      season: shortText,
    })
    .nullable(),
  surname: shortText,
  family: z.array(familyName).max(40),
  chips,
  profile: profile.nullable(),
  namesWeLike: z.array(shortText).max(20),
  declined: z.array(shortText).max(300).default([]),
  ratings: z
    .array(
      z.object({
        nameId: z.number().int(),
        verdict: z.enum(["no", "unsure", "interesting", "taken"]),
        note: z.string().max(300).optional(),
      }),
    )
    .max(200),
  shownIds: z.array(z.number().int()).max(200),
});

export const preferencesRequestSchema = z.object({
  chips,
  texts: z.array(z.string().trim().max(500)).max(30),
  namesWeLike: z.array(shortText).max(20),
  family: z.array(familyName).max(40),
});

export const reportRequestSchema = z.object({
  type: z.enum(["error", "suggestion", "other"]),
  message: z.string().trim().min(1).max(1000),
  screen: z.string().max(40),
  appVersion: z.string().max(20),
  device: z.string().max(200),
  nameId: z.number().int().optional(),
  nameHe: shortText.optional(),
  website: z.string().max(200).optional(),
  elapsedMs: z.number().nonnegative(),
});

export const errorReportRequestSchema = z.object({
  kind: z.enum(["server", "client"]),
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  errorId: z.string().regex(/^[2-9A-Z]{8}$/).optional(),
  path: z.string().regex(/^\/api\/[a-z-/]{1,40}$/).optional(),
  status: z.number().int().min(500).max(599).optional(),
  screen: z.string().max(40),
  appVersion: z.string().max(20),
  device: z.string().max(200),
  journey: z.array(z.object({ at: z.string().max(30), what: z.string().max(220) })).max(100),
});

export type ErrorReportRequest = z.infer<typeof errorReportRequestSchema>;
