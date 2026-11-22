import type { RecordedEvent, StoredEvent } from "@/lib/analytics/events";
import type { SpendDay } from "@/lib/analytics/stats";
import type { NameEntry } from "@/lib/types";

export type ReportType = "error" | "suggestion" | "other";

/** Why the feedback check marked a report. Marked reports are still kept and emailed, in their own section. */
export type FeedbackFlag = "offensive" | "attack" | "spam";

export interface ReportContext {
  screen: string;
  appVersion: string;
  device: string;
  nameId?: number;
  nameHe?: string;
  hasLinks: boolean;
  /** Missing on reports stored before the feedback check existed. */
  flag?: FeedbackFlag | null;
  /** False when only the rules ran, without the model. */
  checked?: boolean;
}

export interface Report {
  type: ReportType;
  message: string;
  context: ReportContext;
  createdAt: Date;
}

/** Everything the server keeps. None of it identifies the parent. */
export interface Store {
  loadNames(): Promise<NameEntry[]>;
  getSetting(key: string): Promise<string | null>;
  getSpend(day: string): Promise<number>;
  addSpend(day: string, usd: number): Promise<number>;
  /** True only for the call that first marks the day's alert as sent. */
  claimSpendAlert(day: string): Promise<boolean>;
  addReport(report: Report): Promise<void>;
  /** How many reports wait for the next daily email. */
  countReports(): Promise<number>;
  /** Returns all held reports and deletes them. */
  takeReports(): Promise<Report[]>;
  addEvent(event: RecordedEvent): Promise<void>;
  /** Events since the given time, or all of them for null. */
  listEvents(since: Date | null): Promise<StoredEvent[]>;
  /** Days on or after the given YYYY-MM-DD, or all of them for null. */
  listSpend(sinceDay: string | null): Promise<SpendDay[]>;
}
