import { handler } from "@/lib/server/http";
import { budgetLeft } from "@/lib/server/spend";
import { newSession } from "@/lib/server/token";

export const POST = handler(async () => ({
  body: { open: await budgetLeft() },
  session: newSession(),
}));
