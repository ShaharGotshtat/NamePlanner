import { APP_NAME_EN } from "@/lib/constants";
import { sendOwnerEmail } from "./email";
import { getStore } from "./store";

const DEFAULT_BUDGET_USD = 3;
const ALERT_SHARE = 0.8;

/** The budget day resets at midnight Israel time. */
export const budgetDay = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

export async function dailyBudget(): Promise<number> {
  const stored = await getStore().getSetting("daily_budget_usd");
  return Number(stored ?? process.env.DAILY_BUDGET_USD ?? DEFAULT_BUDGET_USD);
}

export async function budgetLeft(): Promise<boolean> {
  const [spent, budget] = await Promise.all([getStore().getSpend(budgetDay()), dailyBudget()]);
  return spent < budget;
}

export async function recordSpend(usd: number): Promise<void> {
  const store = getStore();
  const day = budgetDay();
  const [total, budget] = await Promise.all([store.addSpend(day, usd), dailyBudget()]);
  if (total >= budget * ALERT_SHARE && (await store.claimSpendAlert(day))) {
    await sendOwnerEmail(
      `${APP_NAME_EN}: 80% מתקציב ה-LLM היומי נוצל`,
      `נוצלו ${total.toFixed(2)}$ מתוך ${budget}$ היום (${day}).`,
    ).catch((error) => console.error("Budget alert failed", error));
  }
}
