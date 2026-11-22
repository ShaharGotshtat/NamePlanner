import { z } from "zod";

/**
 * Anonymous usage events. Two random ids are made on the device (see client/analytics): a daily id, replaced at
 * midnight Israel time, for counting unique users per day, and a run id for one search.
 * No names, free text, family names or dates are ever sent.
 */
export const SHARE_CHANNELS = ["whatsapp", "copy", "share"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

const count = z.number().int().min(0).max(1000);

export const eventSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("visit"), props: z.object({ mobile: z.boolean() }) }),
  z.object({ name: z.literal("screen"), props: z.object({ step: z.enum(["welcome", "family", "preferences", "rounds", "summary"]) }) }),
  z.object({ name: z.literal("round_done"), props: z.object({ pass: count, round: count }) }),
  z.object({
    name: z.literal("finished"),
    props: z.object({ pass: count, interesting: count, unsure: count, no: count, taken: count }),
  }),
  z.object({ name: z.literal("preferences"), props: z.object({ chips: z.array(z.string().regex(/^[a-zA-Z0-9]{1,40}$/)).max(60), freeText: z.boolean(), namesWeLike: count }) }),
  z.object({ name: z.literal("share"), props: z.object({ channel: z.enum(SHARE_CHANNELS) }) }),
  z.object({ name: z.literal("go_again"), props: z.object({ pass: count }) }),
  z.object({ name: z.literal("our_pick"), props: z.object({ action: z.enum(["accepted", "dismissed"]) }) }),
]);

export type AppEvent = z.infer<typeof eventSchema>;

export const eventRequestSchema = z.object({
  daily: z.uuid(),
  run: z.uuid(),
  event: eventSchema,
});

export type EventRequest = z.infer<typeof eventRequestSchema>;

/** Events the server records itself. They carry the nil id in place of the device ids. */
export type ServerEvent = { name: "round_served"; props: { llm: boolean } };
export const SERVER_ID = "00000000-0000-0000-0000-000000000000";

export type EventName = AppEvent["name"] | ServerEvent["name"];
export type RecordedEvent = { daily: string; run: string; event: AppEvent | ServerEvent };

/** One stored event, as the dashboard reads it. */
export interface StoredEvent {
  at: Date;
  daily: string;
  run: string;
  name: EventName;
  props: Record<string, unknown>;
}
