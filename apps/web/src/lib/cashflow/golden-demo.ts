// Prints the golden projection side-by-side with the spec's expected numbers.
// Run: npx tsx src/lib/cashflow/golden-demo.ts
import { projectCashflow } from "./scheduler";
import { GOLDEN_EXPECTED, GOLDEN_INCOMES, GOLDEN_OBLIGATIONS } from "./golden-scenario";

const projection = projectCashflow({
  obligations: GOLDEN_OBLIGATIONS,
  incomes: GOLDEN_INCOMES,
  months: 8,
});

const r = (n: number) => n.toLocaleString("en-US");
const pad = (s: string, w: number) => s.padEnd(w);
const padL = (s: string, w: number) => s.padStart(w);

console.log("\nGolden scenario — actual vs expected (amounts in rupees)\n");
console.log(
  pad("Mo", 4) + padL("Actual due", 12) + padL("Expected", 12) +
  padL("Flag", 8) + padL("Shortfall", 12) + "   Match  Detail",
);
console.log("─".repeat(96));

let allMatch = true;
for (const m of projection) {
  const exp = GOLDEN_EXPECTED.find((e) => e.month === m.month)!;
  const match =
    m.dueTotal === exp.dueTotal && m.flagged === exp.flagged && m.shortfall === exp.shortfall;
  allMatch &&= match;
  const detail =
    m.items.map((i) => `${i.payee} ${r(i.amount)}`).join(" + ") +
    (m.slideSuggestions.length
      ? `  → slide ${m.slideSuggestions[0].payee} (→ ${r(m.slideSuggestions[0].dueTotalAfterSlide)}, ${m.slideSuggestions[0].resolvesShortfall ? "resolves" : "still over"})`
      : "");
  console.log(
    pad(String(m.month), 4) +
    padL(r(m.dueTotal), 12) +
    padL(r(exp.dueTotal), 12) +
    padL(m.flagged ? "FLAG" : "ok", 8) +
    padL(m.shortfall ? r(m.shortfall) : "-", 12) +
    (match ? "   ✓    " : "   ✗    ") +
    " " + detail,
  );
}
console.log("─".repeat(96));
console.log(`\nFloor income compared against: ${r(projection[0].floorIncome)} (freelance floor alone)`);
console.log(`Total expected income (context): ${r(projection[0].expectedIncome)} (salary + floor)`);
console.log(allMatch ? "\n✅ ALL MONTHS MATCH THE SPEC.\n" : "\n❌ MISMATCH.\n");
process.exit(allMatch ? 0 : 1);
