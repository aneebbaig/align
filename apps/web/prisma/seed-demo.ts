/**
 * Demo dataset - a fictional household with a few months of history, used for
 * README screenshots and for poking at the app without inventing data by hand.
 *
 * DESTRUCTIVE: deletes every user (and everything cascading off them) before
 * seeding, so it refuses to run against a non-local database unless
 * DEMO_SEED_ALLOW_REMOTE=yes is set explicitly.
 *
 *   docker compose up -d db
 *   DATABASE_URL=postgresql://align:align@localhost:5434/align_dev pnpm seed:demo
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES, defaultCategoryId } from "../src/lib/default-categories";

const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl) throw new Error("DATABASE_URL is not set");

const isLocalDb = /@(localhost|127\.0\.0\.1|db)(:|\/)/.test(dbUrl);
if (!isLocalDb && process.env.DEMO_SEED_ALLOW_REMOTE !== "yes") {
  throw new Error(
    "Refusing to seed demo data into a non-local database - this wipes existing data.\n" +
      "If that is really the intent, set DEMO_SEED_ALLOW_REMOTE=yes."
  );
}

const adapter = dbUrl.includes(".neon.tech")
  ? new PrismaNeon({ connectionString: dbUrl })
  : new PrismaPg({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

// ─── helpers ────────────────────────────────────────────────────────────────

/** Rupees to paisas. Every money column in the schema is the smallest unit. */
const pkr = (rupees: number) => Math.round(rupees * 100);
/** Dollars to cents. */
const usd = (dollars: number) => Math.round(dollars * 100);

const now = new Date();
const CURRENT = { month: now.getMonth() + 1, year: now.getFullYear() };

/** (month, year) n months before the current period. */
function periodBack(n: number) {
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/** A date inside a given period, clamped to a day that exists in that month. */
function dayIn(period: { month: number; year: number }, day: number) {
  const lastDay = new Date(period.year, period.month, 0).getDate();
  return new Date(period.year, period.month - 1, Math.min(day, lastDay), 12, 0, 0);
}

function daysFromNow(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Deterministic jitter, so screenshots do not change between runs. */
let seedState = 42;
function jitter(spread: number) {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return Math.round(((seedState / 2147483648) * 2 - 1) * spread);
}

// ─── the household ──────────────────────────────────────────────────────────

const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@example.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo12345";
const DEMO_NAME = process.env.DEMO_NAME || "Sana Iqbal";

const SALARY = pkr(320_000);

/** Recurring monthly spend: [category, description, rupees, day of month]. */
const MONTHLY_SPEND: [string, string, number, number][] = [
  ["Rent & Housing", "Apartment rent", 95_000, 2],
  ["Utilities", "K-Electric bill", 14_500, 8],
  ["Utilities", "Sui Gas", 3_200, 9],
  ["Utilities", "Internet - fibre", 4_500, 5],
  ["Groceries", "Monthly grocery run", 38_000, 3],
  ["Groceries", "Vegetables and fruit", 6_400, 12],
  ["Groceries", "Top-up shop", 5_100, 21],
  ["Transport & Fuel", "Petrol", 12_000, 6],
  ["Transport & Fuel", "Petrol", 11_500, 19],
  ["Food & Dining", "Dinner out", 6_800, 14],
  ["Food & Dining", "Coffee and snacks", 2_400, 17],
  ["Food & Dining", "Family lunch", 9_200, 24],
  ["Subscriptions", "Streaming", 1_500, 4],
  ["Subscriptions", "Cloud storage", 900, 4],
  ["Healthcare", "Pharmacy", 4_300, 15],
  ["Personal Care", "Salon", 3_500, 18],
  ["Education", "School fee", 28_000, 7],
  ["Shopping", "Household items", 7_600, 11],
  ["Entertainment", "Cinema", 3_200, 22],
  ["Car Maintenance", "Service and oil change", 8_500, 16],
  ["Miscellaneous", "Charity", 10_000, 10],
];

async function main() {
  console.log("Wiping existing data...");
  // Everything hangs off User with onDelete: Cascade, so this clears the
  // household in one go. Built-in categories (userId null) survive and are
  // reused below.
  await prisma.user.deleteMany({});
  await prisma.category.deleteMany({ where: { userId: { not: null } } });
  await prisma.currency.deleteMany({});

  console.log("Seeding currencies...");
  const pkrCurrency = await prisma.currency.create({
    data: { code: "PKR", symbol: "Rs", rateToBase: 1, isBase: true },
  });
  const usdCurrency = await prisma.currency.create({
    data: { code: "USD", symbol: "$", rateToBase: 278.5, isBase: false },
  });

  console.log("Seeding categories...");
  await Promise.all(
    DEFAULT_CATEGORIES.map((cat) =>
      prisma.category.upsert({
        where: { id: defaultCategoryId(cat.name) },
        update: {},
        create: {
          id: defaultCategoryId(cat.name),
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          isDefault: true,
          userId: null,
        },
      })
    )
  );
  const categoryId = (name: string) => defaultCategoryId(name);

  console.log("Seeding user...");
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      hashedPassword: await bcrypt.hash(DEMO_PASSWORD, 10),
      role: "SUPER_ADMIN",
      emailVerified: true,
      currentBudgetMonth: CURRENT.month,
      currentBudgetYear: CURRENT.year,
    },
  });

  // better-auth signs in against the credential `account` row (lib/auth.ts
  // configures the bcrypt verify), not User.hashedPassword.
  await prisma.account.create({
    data: {
      id: `cred_${user.id}`,
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: user.hashedPassword,
    },
  });

  // ─── transactions: three months of history ────────────────────────────────
  console.log("Seeding transactions...");
  // Six months: enough history for the dashboard trend chart to have a shape.
  const periods = [5, 4, 3, 2, 1].map(periodBack).concat(CURRENT);
  let expenseCount = 0;

  for (const [index, period] of periods.entries()) {
    const isCurrent = period.month === CURRENT.month && period.year === CURRENT.year;

    await prisma.transaction.create({
      data: {
        amount: SALARY,
        type: "INCOME",
        categoryId: categoryId("Salary"),
        description: "Monthly salary",
        date: dayIn(period, 1),
        budgetMonth: period.month,
        budgetYear: period.year,
        userId: user.id,
      },
    });

    await prisma.transaction.create({
      data: {
        amount: pkr(52_000) + pkr(jitter(9_000)),
        type: "INCOME",
        categoryId: categoryId("Freelance"),
        description: "Design retainer - Meridian",
        date: dayIn(period, 13),
        budgetMonth: period.month,
        budgetYear: period.year,
        userId: user.id,
      },
    });

    for (const [category, description, rupees, day] of MONTHLY_SPEND) {
      // The current month is only part-way through - skip anything not due yet
      // so the dashboard shows a month in progress, not a finished one.
      if (isCurrent && day > now.getDate()) continue;

      await prisma.transaction.create({
        data: {
          amount: pkr(rupees) + pkr(jitter(Math.round(rupees * 0.06))),
          type: "EXPENSE",
          categoryId: categoryId(category),
          description,
          date: dayIn(period, day),
          budgetMonth: period.month,
          budgetYear: period.year,
          userId: user.id,
          isRegretPurchase: index === 1 && category === "Shopping",
        },
      });
      expenseCount++;
    }
  }
  console.log(`✓ ${expenseCount} expenses across ${periods.length} months`);

  // ─── budgets ──────────────────────────────────────────────────────────────
  console.log("Seeding budgets...");
  const ALLOCATIONS: [string, number][] = [
    ["Rent & Housing", 95_000],
    ["Groceries", 52_000],
    ["Utilities", 24_000],
    ["Transport & Fuel", 26_000],
    ["Food & Dining", 20_000],
    ["Education", 28_000],
    ["Healthcare", 8_000],
    ["Shopping", 12_000],
    ["Entertainment", 6_000],
    ["Personal Care", 5_000],
    ["Subscriptions", 3_000],
    ["Car Maintenance", 10_000],
    ["Miscellaneous", 12_000],
  ];
  const totalBudget = ALLOCATIONS.reduce((sum, [, amount]) => sum + pkr(amount), 0);

  for (const period of periods) {
    await prisma.budget.create({
      data: {
        month: period.month,
        year: period.year,
        totalBudget,
        userId: user.id,
        budgetCategories: {
          create: ALLOCATIONS.map(([name, amount]) => ({
            categoryId: categoryId(name),
            allocatedAmount: pkr(amount),
          })),
        },
      },
    });
  }

  // ─── savings pots ─────────────────────────────────────────────────────────
  console.log("Seeding savings pots...");
  const pots: {
    name: string;
    icon: string;
    color: string;
    type: string;
    targetAmount: number;
    targetDate?: Date;
    balances: { currency: string; amount: number }[];
  }[] = [
    {
      name: "Emergency Fund",
      icon: "ShieldCheck",
      color: "#22c55e",
      type: "EMERGENCY",
      targetAmount: pkr(1_800_000),
      balances: [{ currency: pkrCurrency.id, amount: pkr(1_140_000) }],
    },
    {
      name: "Everyday Buffer",
      icon: "Wallet",
      color: "#3b82f6",
      type: "LIQUID",
      targetAmount: pkr(200_000),
      balances: [{ currency: pkrCurrency.id, amount: pkr(146_500) }],
    },
    {
      name: "Dollar Savings",
      icon: "DollarSign",
      color: "#14b8a6",
      type: "GENERAL",
      targetAmount: 0,
      balances: [{ currency: usdCurrency.id, amount: usd(2_150) }],
    },
    {
      name: "Umrah Trip",
      icon: "Plane",
      color: "#a855f7",
      type: "GOAL",
      targetAmount: pkr(900_000),
      targetDate: daysFromNow(240),
      balances: [{ currency: pkrCurrency.id, amount: pkr(385_000) }],
    },
    {
      name: "House Down Payment",
      icon: "Home",
      color: "#f59e0b",
      type: "GOAL",
      targetAmount: pkr(6_000_000),
      targetDate: daysFromNow(900),
      balances: [{ currency: pkrCurrency.id, amount: pkr(1_620_000) }],
    },
  ];

  for (const pot of pots) {
    const created = await prisma.savingsPot.create({
      data: {
        name: pot.name,
        icon: pot.icon,
        color: pot.color,
        type: pot.type,
        targetAmount: pot.targetAmount,
        targetDate: pot.targetDate,
        userId: user.id,
        balances: {
          create: pot.balances.map((b) => ({ currencyId: b.currency, amount: b.amount })),
        },
      },
    });

    // A little deposit history, so the pot detail view is not empty.
    for (const [index, period] of periods.entries()) {
      await prisma.savingsPotEntry.create({
        data: {
          potId: created.id,
          currencyId: pot.balances[0].currency,
          amount: Math.round(pot.balances[0].amount / (6 + index)),
          sourceType: "INCOME",
          description: "Monthly contribution",
          budgetMonth: period.month,
          budgetYear: period.year,
          createdAt: dayIn(period, 2),
        },
      });
    }
  }

  // What this month's income is earmarked to put into each pot - the top half
  // of the Budget page, and empty without these rows.
  const currentBudget = await prisma.budget.findFirst({
    where: { month: CURRENT.month, year: CURRENT.year },
  });
  if (currentBudget) {
    const MONTHLY_SAVING: [string, number][] = [
      ["Emergency Fund", 25_000],
      ["Umrah Trip", 15_000],
      ["House Down Payment", 30_000],
    ];
    for (const [name, amount] of MONTHLY_SAVING) {
      const pot = await prisma.savingsPot.findFirst({ where: { name, userId: user.id } });
      if (!pot) continue;
      await prisma.budgetSavingsAllocation.create({
        data: { budgetId: currentBudget.id, potId: pot.id, amount: pkr(amount) },
      });
    }
  }

  // ─── investments ──────────────────────────────────────────────────────────
  console.log("Seeding investments...");
  const investments = [
    {
      name: "Meezan Islamic Fund",
      type: "MUTUAL_FUND",
      platform: "Meezan Invest",
      invested: pkr(480_000),
      current: pkr(541_000),
      purchased: daysFromNow(-540),
    },
    {
      name: "Gold (tola)",
      type: "GOLD",
      platform: "Local jeweller",
      invested: pkr(620_000),
      current: pkr(742_000),
      purchased: daysFromNow(-720),
    },
    {
      name: "MZNPETF",
      type: "STOCKS",
      platform: "Sarmaaya",
      invested: pkr(210_000),
      current: pkr(198_500),
      purchased: daysFromNow(-300),
    },
  ];

  for (const inv of investments) {
    const created = await prisma.investment.create({
      data: {
        name: inv.name,
        type: inv.type,
        platform: inv.platform,
        investedAmount: inv.invested,
        currentValue: inv.current,
        purchaseDate: inv.purchased,
        userId: user.id,
      },
    });
    for (const period of periods) {
      await prisma.investmentContribution.create({
        data: {
          investmentId: created.id,
          amount: Math.round(inv.invested / 12),
          date: dayIn(period, 5),
          notes: "Monthly SIP",
        },
      });
    }
  }

  // The plan needs its split to render as anything other than an empty state.
  const investmentPlan = await prisma.investmentPlan.create({
    data: { userId: user.id, monthlyTarget: pkr(60_000), autoFromSurplus: true },
  });
  const planCategories = await Promise.all(
    [
      { name: "Equity fund", investmentType: "MUTUAL_FUND", percentage: 45, order: 0 },
      { name: "Gold", investmentType: "GOLD", percentage: 35, order: 1 },
      { name: "Direct stocks", investmentType: "STOCKS", percentage: 20, order: 2 },
    ].map((c) => prisma.investmentPlanCategory.create({ data: { ...c, planId: investmentPlan.id } }))
  );

  // Match each SIP to the slice of the plan it counts toward.
  for (const category of planCategories) {
    await prisma.investment.updateMany({
      where: { userId: user.id, type: category.investmentType ?? "" },
      data: { planCategoryId: category.id },
    });
  }

  // ─── loans ────────────────────────────────────────────────────────────────
  console.log("Seeding loans...");
  const lent = await prisma.loan.create({
    data: {
      personName: "Hamza",
      description: "Helped with a car repair",
      type: "GIVEN",
      principalAmount: pkr(120_000),
      remainingAmount: pkr(70_000),
      date: daysFromNow(-95),
      dueDate: daysFromNow(40),
      status: "PARTIALLY_PAID",
      userId: user.id,
    },
  });
  await prisma.loanPayment.create({
    data: {
      loanId: lent.id,
      amount: pkr(50_000),
      date: daysFromNow(-20),
      notes: "First instalment back",
    },
  });

  const borrowed = await prisma.loan.create({
    data: {
      personName: "Abbu",
      description: "Bridge for the house deposit",
      type: "RECEIVED",
      principalAmount: pkr(500_000),
      remainingAmount: pkr(350_000),
      date: daysFromNow(-160),
      dueDate: daysFromNow(210),
      status: "PARTIALLY_PAID",
      userId: user.id,
    },
  });
  await prisma.loanPayment.create({
    data: {
      loanId: borrowed.id,
      amount: pkr(150_000),
      date: daysFromNow(-45),
      notes: "Paid back after the bonus",
    },
  });
  await prisma.loanSchedule.create({
    data: {
      loanId: borrowed.id,
      kind: "FIXED_INSTALLMENT",
      amount: pkr(50_000),
      startDate: daysFromNow(14),
      endDate: daysFromNow(210),
      flexibility: "FLEXIBLE",
      slideWindowMonths: 1,
      priority: 2,
      userId: user.id,
    },
  });

  // ─── cash-flow inputs ─────────────────────────────────────────────────────
  console.log("Seeding recurring income and planned expenses...");
  await prisma.recurringIncome.create({
    data: {
      label: "Salary - Northline",
      kind: "SALARY",
      amount: SALARY,
      dayOfMonth: 1,
      startDate: daysFromNow(-800),
      userId: user.id,
    },
  });
  await prisma.recurringIncome.create({
    data: {
      label: "Design retainer",
      kind: "FREELANCE",
      amount: pkr(45_000),
      variable: true,
      countsTowardFloor: true,
      startDate: daysFromNow(-400),
      userId: user.id,
    },
  });

  await prisma.plannedExpense.createMany({
    data: [
      {
        name: "School fees - next term",
        amount: pkr(84_000),
        dueDate: daysFromNow(38),
        categoryId: categoryId("Education"),
        priority: 1,
        userId: user.id,
      },
      {
        name: "Car insurance renewal",
        amount: pkr(46_000),
        dueDate: daysFromNow(72),
        flexibility: "FLEXIBLE",
        slideWindowMonths: 1,
        categoryId: categoryId("Car Maintenance"),
        priority: 3,
        userId: user.id,
      },
      {
        name: "Annual home maintenance",
        amount: pkr(60_000),
        dueDate: daysFromNow(120),
        flexibility: "FLEXIBLE",
        slideWindowMonths: 2,
        priority: 4,
        userId: user.id,
      },
    ],
  });

  // ─── planner ──────────────────────────────────────────────────────────────
  console.log("Seeding planner...");
  const plan = await prisma.plan.create({
    data: {
      name: "Kitchen refresh",
      description: "Cabinets, counter, and a proper exhaust",
      icon: "Hammer",
      planType: "ITEMIZED",
      type: "RENOVATION",
      estimatedTotalCost: pkr(465_000),
      targetDate: daysFromNow(150),
      status: "IN_PROGRESS",
      userId: user.id,
      items: {
        create: [
          { name: "Cabinets", estimatedCost: pkr(240_000), status: "BOOKED", vendor: "Interwood" },
          { name: "Counter top", estimatedCost: pkr(120_000), status: "PENDING" },
          {
            name: "Exhaust and hood",
            estimatedCost: pkr(45_000),
            status: "PAID",
            actualCost: pkr(43_500),
          },
          { name: "Paint and labour", estimatedCost: pkr(60_000), status: "PENDING" },
        ],
      },
    },
  });

  // ─── tasks, projects, lists, calendar ─────────────────────────────────────
  console.log("Seeding tasks, projects, and lists...");
  await prisma.task.createMany({
    data: [
      { title: "Log yesterday spend", type: "DAILY", priority: "MEDIUM", status: "DONE", completedAt: now, userId: user.id },
      { title: "Walk 8k steps", type: "DAILY", priority: "LOW", status: "PENDING", userId: user.id },
      { title: "Read 20 pages", type: "DAILY", priority: "LOW", status: "DONE", completedAt: now, userId: user.id },
      { title: "Pay electricity bill", type: "ONE_TIME", priority: "HIGH", status: "PENDING", dueDate: daysFromNow(3), userId: user.id },
      { title: "Renew car token tax", type: "ONE_TIME", priority: "URGENT", status: "IN_PROGRESS", dueDate: daysFromNow(1), userId: user.id },
      { title: "Book dentist appointment", type: "ONE_TIME", priority: "MEDIUM", status: "PENDING", dueDate: daysFromNow(9), userId: user.id },
    ],
  });

  const tagUrgent = await prisma.tag.create({
    data: { name: "Urgent", color: "#ef4444", userId: user.id },
  });
  const tagClient = await prisma.tag.create({
    data: { name: "Client", color: "#6366f1", userId: user.id },
  });

  const project = await prisma.project.create({
    data: {
      name: "Meridian brand refresh",
      client: "Meridian Foods",
      description: "Logo, packaging, and a one-page site",
      color: "#6366F1",
      status: "ACTIVE",
      dueDate: daysFromNow(26),
      userId: user.id,
      tasks: {
        create: [
          { title: "Moodboard", status: "DONE", priority: "MEDIUM", order: 0 },
          { title: "Logo concepts", status: "DONE", priority: "HIGH", order: 1 },
          {
            title: "Packaging mockups",
            status: "IN_PROGRESS",
            priority: "HIGH",
            order: 2,
            dueDate: daysFromNow(7),
          },
          { title: "Landing page copy", status: "REVIEW", priority: "MEDIUM", order: 3 },
          {
            title: "Handover pack",
            status: "TODO",
            priority: "LOW",
            order: 4,
            dueDate: daysFromNow(24),
          },
        ],
      },
    },
    include: { tasks: true },
  });

  await prisma.projectTaskTag.createMany({
    data: [
      { taskId: project.tasks[2].id, tagId: tagUrgent.id },
      { taskId: project.tasks[2].id, tagId: tagClient.id },
      { taskId: project.tasks[4].id, tagId: tagClient.id },
    ],
  });

  await prisma.project.create({
    data: {
      name: "Personal site rebuild",
      description: "Portfolio, finally",
      color: "#14B8A6",
      status: "ON_HOLD",
      userId: user.id,
      tasks: {
        create: [
          { title: "Pick a stack", status: "DONE", priority: "LOW", order: 0 },
          { title: "Write case studies", status: "TODO", priority: "MEDIUM", order: 1 },
        ],
      },
    },
  });

  await prisma.wantListItem.createMany({
    data: [
      {
        name: "Mechanical keyboard",
        estimatedCost: pkr(28_000),
        status: "WAITING",
        remindAt: daysFromNow(1),
        categoryHint: "Shopping",
        userId: user.id,
      },
      {
        name: "Espresso machine",
        estimatedCost: pkr(65_000),
        status: "WAITING",
        remindAt: daysFromNow(4),
        categoryHint: "Shopping",
        userId: user.id,
      },
      {
        name: "Noise-cancelling headphones",
        estimatedCost: pkr(42_000),
        status: "DISMISSED",
        remindAt: daysFromNow(-6),
        userId: user.id,
      },
    ],
  });

  await prisma.needListItem.createMany({
    data: [
      {
        name: "Winter school uniforms",
        estimatedCost: pkr(18_000),
        priority: "HIGH",
        status: "PENDING",
        userId: user.id,
      },
      {
        name: "Replace kitchen mixer",
        estimatedCost: pkr(22_000),
        priority: "MEDIUM",
        status: "PENDING",
        userId: user.id,
      },
      {
        name: "New tyres",
        estimatedCost: pkr(58_000),
        priority: "HIGH",
        status: "DONE",
        doneAt: daysFromNow(-12),
        userId: user.id,
      },
    ],
  });

  await prisma.calendarEvent.createMany({
    data: [
      { title: "Salary lands", date: daysFromNow(6), type: "REMINDER", userId: user.id },
      { title: "School fee due", date: daysFromNow(38), type: "DEADLINE", userId: user.id },
      {
        title: "Meridian handover call",
        date: daysFromNow(12),
        type: "EVENT",
        startTime: "16:00",
        isAllDay: false,
        userId: user.id,
      },
    ],
  });

  // The vault is super-admin only in the app, so it needs a row to show anything.
  const surprise = await prisma.surprise.create({
    data: {
      name: "Anniversary weekend",
      forWhom: "Hira",
      occasion: "Anniversary",
      description: "Northern trip, keep it quiet",
      targetDate: daysFromNow(54),
      estimatedBudget: pkr(180_000),
      actualSpent: pkr(35_000),
      status: "PLANNING",
      userId: user.id,
    },
  });
  await prisma.surpriseItem.createMany({
    data: [
      {
        surpriseId: surprise.id,
        name: "Hotel booking",
        estimatedCost: pkr(90_000),
        status: "SHORTLISTED",
      },
      { surpriseId: surprise.id, name: "Gift - watch", estimatedCost: pkr(65_000), status: "IDEA" },
      {
        surpriseId: surprise.id,
        name: "Travel",
        estimatedCost: pkr(35_000),
        actualCost: pkr(35_000),
        status: "BOUGHT",
      },
    ],
  });

  console.log(`\n✅ Demo data seeded. Sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   ${plan.name}, ${pots.length} pots, ${investments.length} investments\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
