import type { YearStat } from "@/lib/types";

/**
 * Era comes only from CBS data, never from anyone's feel for a name: the average birth year of
 * the babies given the name, with each year weighted by the name's share of that year's births,
 * so the growing number of births does not pull every name toward recent years.
 * The cut points are decades: 1 before 1975, 2 1975-1989, 3 the 1990s, 4 the 2000s, 5 from 2010.
 */
export const ERA_CUTS = [1975, 1990, 2000, 2010] as const;

export const eraOfYear = (year: number) => 1 + ERA_CUTS.filter((cut) => year >= cut).length;

/** Share-weighted average birth year. `totals` is all babies born in each year. */
export function averageBirthYear(stats: Pick<YearStat, "year" | "count">[], totals: Map<number, number>): number {
  let weighted = 0;
  let weights = 0;
  for (const { year, count } of stats) {
    const total = totals.get(year);
    if (!count || !total) continue;
    const share = count / total;
    weighted += year * share;
    weights += share;
  }
  return weights ? weighted / weights : NaN;
}
