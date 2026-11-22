import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { modelFailureOccurrence, sendInBackground } from "./github-errors";
import { currentRequestId, log } from "./request-id";
import { budgetLeft, recordSpend } from "./spend";

export const MODELS = {
  pick: "claude-sonnet-5-5",
  parse: "claude-haiku-5-5",
} as const;

type Model = (typeof MODELS)[keyof typeof MODELS];

const USD_PER_MTOK: Record<Model, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

let client: Anthropic | null | undefined;
const getClient = () => (client ??= process.env.ANTHROPIC_API_KEY ? new Anthropic() : null);

export const modelConfigured = () => getClient() !== null;

interface StructuredCall<T extends z.ZodType> {
  model: Model;
  system: string;
  prompt: string;
  /** Validates the answer. */
  schema: T;
  /** The JSON format the model is asked for, when it should be stricter than what is accepted. Defaults to schema. */
  format?: z.ZodType;
  maxTokens: number;
}

/** Why a call gave no usable output. Each kind becomes its own error issue, so a new failure mode is visible. */
type Failure = { kind: string; detail: string };

const ATTEMPTS = 2;

/**
 * One structured call, counted against the daily budget.
 * Returns null when the model is not configured, the budget is spent, or the call fails,
 * so callers fall back to the ranking rules. Never throws for a bad model answer: a cut-off
 * or unparseable answer is retried once (with more room if it was cut off), then reported.
 */
export async function structuredCall<T extends z.ZodType>(call: StructuredCall<T>): Promise<z.infer<T> | null> {
  const anthropic = getClient();
  if (!anthropic) {
    log.warn(`${call.model} skipped: ANTHROPIC_API_KEY is not set`);
    return null;
  }

  let maxTokens = call.maxTokens;
  let failure: Failure | null = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (!(await budgetLeft())) {
      log.warn(`${call.model} skipped: daily budget is spent`);
      return reportFailure(call.model, { kind: "budget spent", detail: "The daily model budget is spent." });
    }
    try {
      const response = await anthropic.messages.create({
        model: call.model,
        max_tokens: maxTokens,
        system: call.system,
        messages: [{ role: "user", content: call.prompt }],
        output_config: { format: zodOutputFormat(call.format ?? call.schema), effort: "low" },
      });
      const price = USD_PER_MTOK[call.model];
      await recordSpend((response.usage.input_tokens * price.input + response.usage.output_tokens * price.output) / 1e6);
      const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
      const usage = `stop_reason ${response.stop_reason}, ${response.usage.output_tokens} of ${maxTokens} output tokens`;

      if (response.stop_reason === "end_turn") {
        const parsed = parseJson(call.schema, text);
        if (parsed.ok) return parsed.value;
        failure = { kind: "unparseable output", detail: `${usage}\n${parsed.error}\n\nOutput:\n${text.slice(0, 1500)}` };
      } else {
        failure = { kind: `stopped early (${response.stop_reason})`, detail: `${usage}\n\nOutput:\n${text.slice(0, 1500)}` };
        if (response.stop_reason === "max_tokens") maxTokens *= 2;
        else if (response.stop_reason === "refusal") break;
      }
      log.warn(`${call.model} attempt ${attempt}: ${failure.kind}`);
    } catch (error) {
      if (!(error instanceof Anthropic.APIError)) throw error;
      log.error(`${call.model} API error ${error.status}: ${error.message}`);
      return reportFailure(call.model, { kind: `API error ${error.status ?? "network"}`, detail: error.message });
    }
  }
  return reportFailure(call.model, failure!);
}

function parseJson<T extends z.ZodType>(schema: T, text: string): { ok: true; value: z.infer<T> } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: `Not JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
  const result = schema.safeParse(json);
  return result.success ? { ok: true, value: result.data } : { ok: false, error: `Schema mismatch: ${result.error.message.slice(0, 800)}` };
}

function reportFailure(model: Model, failure: Failure): null {
  sendInBackground(modelFailureOccurrence(model, failure.kind, failure.detail, currentRequestId()));
  return null;
}
