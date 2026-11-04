import sample from "../data/names.sample.json";
import type { NameEntry, RoundRequest } from "@/lib/types";

export const names = sample as NameEntry[];

export const byName = (nameHe: string) => names.find((n) => n.nameHe === nameHe)!;

export function request(overrides: Partial<RoundRequest> = {}): RoundRequest {
  return {
    babySex: "girl",
    dueDerived: null,
    surname: "",
    family: [],
    chips: {},
    profile: null,
    namesWeLike: [],
    ratings: [],
    declined: [],
    shownIds: [],
    ...overrides,
  };
}
