// Amount fields accept simple sums - "35+67", "1000 - 250" - so you can add up
// a bill in the field. Only + and - between plain numbers; the result must be a
// positive amount that fits the database (money is stored as integer paisas).

export type AmountResult =
  | { ok: true; value: number; isExpression: boolean }
  | { ok: false; error: string };

const MAX_PAISAS = 2_147_483_647;
const NUMBER = /^(\d+\.?\d*|\.\d+)$/;

/** Evaluates an amount field's text to a value in major units (e.g. rupees). */
export function evaluateAmount(input: string): AmountResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Amount is required" };
  if (text.startsWith("-")) return { ok: false, error: "Amount can't be negative" };
  if (!/^[\d.+\-\s]+$/.test(text)) return { ok: false, error: "Use numbers with + or − only" };

  // Split into numbers and operators: "35 + 67 - 2" -> ["35", "+", "67", "-", "2"]
  const tokens = text.replace(/\s+/g, " ").replace(/\s*([+-])\s*/g, " $1 ").trim().split(" ");
  if (tokens.length % 2 === 0) return { ok: false, error: "Finish the sum, e.g. 35+67" };

  let paisas = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i % 2 === 1) {
      if (t !== "+" && t !== "-") return { ok: false, error: "Use numbers with + or − only" };
      continue;
    }
    if (!NUMBER.test(t)) return { ok: false, error: i === 0 && tokens.length === 1 ? "Enter a valid amount" : "Check the numbers in the sum" };
    const decimals = t.split(".")[1]?.length ?? 0;
    if (decimals > 2) return { ok: false, error: "Use at most 2 decimal places" };
    const part = Math.round(parseFloat(t) * 100);
    if (part > MAX_PAISAS) return { ok: false, error: "Amount is too large" };
    paisas += i === 0 || tokens[i - 1] === "+" ? part : -part;
    if (Math.abs(paisas) > MAX_PAISAS) return { ok: false, error: "Amount is too large" };
  }

  if (paisas < 0) return { ok: false, error: "Result can't be negative" };
  if (paisas === 0) return { ok: false, error: "Amount must be greater than zero" };
  return { ok: true, value: paisas / 100, isExpression: tokens.length > 1 };
}
