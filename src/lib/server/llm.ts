import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
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
  schema: T;
  maxTokens: number;
}

/**
 * One structured call, counted against the daily budget.
 * Returns null when the model is not configured, the budget is spent, or the call fails,
 * so callers fall back to the ranking rules.
 */
export async function structuredCall<T extends z.ZodType>(call: StructuredCall<T>): Promise<z.infer<T> | null> {
  const anthropic = getClient();
  if (!anthropic || !(await budgetLeft())) return null;

  try {
    const response = await anthropic.messages.parse({
      model: call.model,
      max_tokens: call.maxTokens,
      system: call.system,
      messages: [{ role: "user", content: call.prompt }],
      output_config: { format: zodOutputFormat(call.schema), effort: "low" },
    });
    const price = USD_PER_MTOK[call.model];
    await recordSpend((response.usage.input_tokens * price.input + response.usage.output_tokens * price.output) / 1e6);
    if (response.stop_reason !== "end_turn") return null;
    return (response.parsed_output as z.infer<T> | null) ?? null;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API error ${error.status}: ${error.message}`);
      return null;
    }
    throw error;
  }
}
