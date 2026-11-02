import type { NameEntry } from "@/lib/types";

export type ReportType = "error" | "suggestion" | "other";

export interface ReportContext {
  screen: string;
  appVersion: string;
  device: string;
  nameId?: number;
  nameHe?: string;
  hasLinks: boolean;
}

export interface Report {
  type: ReportType;
  message: string;
  context: ReportContext;
  createdAt: Date;
}

/** Everything the server keeps. None of it is about the parent. */
export interface Store {
  loadNames(): Promise<NameEntry[]>;
  getSetting(key: string): Promise<string | null>;
  getSpend(day: string): Promise<number>;
  addSpend(day: string, usd: number): Promise<number>;
  /** True only for the call that first marks the day's alert as sent. */
  claimSpendAlert(day: string): Promise<boolean>;
  addReport(report: Report): Promise<void>;
  /** Returns all held reports and deletes them. */
  takeReports(): Promise<Report[]>;
}
