import nodemailer from "nodemailer";
import { APP_NAME } from "@/lib/brand";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendEmail(to: string | string[], subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });
  } catch {
    // Never crash the app on email failure
  }
}

// ─── Shared primitives ───────────────────────────────────────────────────────

const BG     = "#F5F3EF";
const CARD   = "#FFFFFF";
const BORDER = "#E8E3D9";
const TEXT   = "#1C1917";
const MUTED  = "#78716C";
const FAINT  = "#B7AFA3";

function shell(previewText: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-text-size-adjust:100%;mso-line-height-rule:exactly">
  <div style="display:none;max-height:0;overflow:hidden;color:${BG}">${previewText}&nbsp;&#8199;&#65279;&#847;&nbsp;</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG}">
    <tr><td align="center" style="padding:32px 16px 48px">
      <table cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="padding-bottom:28px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.5px;color:${TEXT}">${APP_NAME.toLowerCase()}</span>
              </td>
              <td align="right">
                <span style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${FAINT};letter-spacing:0.02em">Personal Finance</span>
              </td>
            </tr>
          </table>
          <div style="margin-top:14px;height:1px;background-color:${BORDER}"></div>
        </td></tr>

        <!-- Body -->
        <tr><td>${bodyHtml}</td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:32px">
          <div style="height:1px;background-color:${BORDER};margin-bottom:20px"></div>
          <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:${FAINT};margin:0;line-height:1.6">
            ${APP_NAME} &middot; Personal Finance Manager<br/>
            You can manage your notification preferences in <span style="color:${MUTED}">Settings → Notifications</span>.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function sectionLabel(text: string): string {
  return `<p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${FAINT};margin:0 0 10px">${text}</p>`;
}

function card(accentColor: string, content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
      <tr>
        <td width="3" style="background-color:${accentColor};border-radius:2px">&nbsp;</td>
        <td width="12">&nbsp;</td>
        <td style="background-color:${CARD};border:1px solid ${BORDER};border-left:none;border-radius:0 8px 8px 0;padding:16px 18px">
          ${content}
        </td>
      </tr>
    </table>`;
}

function plainCard(content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px">
      <tr>
        <td style="background-color:${CARD};border:1px solid ${BORDER};border-radius:8px;padding:16px 18px">
          ${content}
        </td>
      </tr>
    </table>`;
}

function row(label: string, value: string, valueColor = TEXT): string {
  return `
    <tr>
      <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};padding:5px 0;border-bottom:1px solid ${BORDER}">${label}</td>
      <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:600;color:${valueColor};padding:5px 0;border-bottom:1px solid ${BORDER};text-align:right">${value}</td>
    </tr>`;
}

function statTable(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px">${rows}</table>`;
}

// ─── Alert emails ─────────────────────────────────────────────────────────────

export function budgetWarningEmail(categoryName: string, pct: number, spent: number, allocated: number, symbol = "Rs") {
  const AMBER = "#B45309";
  const body = `
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${TEXT};margin:0 0 4px">Budget Warning</p>
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${MUTED};margin:0 0 20px">${categoryName} · ${pct}% used this month</p>
    ${card(AMBER, `
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:600;color:${AMBER};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.06em;font-size:10px">⚠ Approaching Limit</p>
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${TEXT};margin:0 0 14px;line-height:1.5">
        Your <strong>${categoryName}</strong> category has reached <strong>${pct}%</strong> of the monthly budget.
      </p>
      ${statTable(
        row("Spent",     `${symbol} ${(spent / 100).toLocaleString()}`) +
        row("Budget",    `${symbol} ${(allocated / 100).toLocaleString()}`) +
        row("Remaining", `${symbol} ${((allocated - spent) / 100).toLocaleString()}`, AMBER)
      )}
    `)}`;
  return shell(`${categoryName} is at ${pct}% of budget this month.`, body);
}

export function budgetExceededEmail(categoryName: string, spent: number, allocated: number, symbol = "Rs") {
  const RED = "#DC2626";
  const over = spent - allocated;
  const body = `
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${TEXT};margin:0 0 4px">Budget Exceeded</p>
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${MUTED};margin:0 0 20px">${categoryName} · over by ${symbol} ${(over / 100).toLocaleString()}</p>
    ${card(RED, `
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;color:${RED};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.06em">🚨 Over Budget</p>
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${TEXT};margin:0 0 14px;line-height:1.5">
        You've exceeded the <strong>${categoryName}</strong> budget. Consider pausing spending in this category or adjusting the budget.
      </p>
      ${statTable(
        row("Spent",   `${symbol} ${(spent / 100).toLocaleString()}`,     RED) +
        row("Budget",  `${symbol} ${(allocated / 100).toLocaleString()}`) +
        row("Over by", `${symbol} ${(over / 100).toLocaleString()}`,      RED)
      )}
    `)}`;
  return shell(`${categoryName} budget exceeded by ${symbol} ${(over / 100).toLocaleString()}.`, body);
}

export function doomSpendingEmail(count: number, total: number, symbol = "Rs") {
  const RED = "#DC2626";
  const body = `
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${TEXT};margin:0 0 4px">Doom Spending Alert</p>
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${MUTED};margin:0 0 20px">${count} transactions in the last 2 hours</p>
    ${card(RED, `
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;color:${RED};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.06em">🛑 Rapid Spending Detected</p>
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${TEXT};margin:0 0 14px;line-height:1.5">
        You've added <strong>${count} expense transactions</strong> in the last 2 hours, totalling <strong>${symbol} ${(total / 100).toLocaleString()}</strong>.
      </p>
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};margin:0;line-height:1.6">
        This pattern often signals stress or boredom spending. Take a breath before the next purchase.
      </p>
    `)}`;
  return shell(`${count} expenses in 2 hours - ${symbol} ${(total / 100).toLocaleString()} total.`, body);
}

export function loanDueEmail(personName: string, amount: number, dueDate: Date, symbol = "Rs") {
  const AMBER = "#B45309";
  const dueDateStr = dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const body = `
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${TEXT};margin:0 0 4px">Loan Due Soon</p>
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${MUTED};margin:0 0 20px">${personName} · due ${dueDateStr}</p>
    ${card(AMBER, `
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;color:${AMBER};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.06em">💰 Repayment Due</p>
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${TEXT};margin:0 0 14px;line-height:1.5">
        <strong>${personName}</strong> owes you <strong>${symbol} ${(amount / 100).toLocaleString()}</strong>, due on <strong>${dueDateStr}</strong>.
      </p>
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};margin:0">
        Follow up soon to keep things on track.
      </p>
    `)}`;
  return shell(`${personName} owes you ${symbol} ${(amount / 100).toLocaleString()} - due ${dueDateStr}.`, body);
}

// ─── Daily digest ─────────────────────────────────────────────────────────────

export function dailyDigestEmail(data: {
  name: string;
  todayEvents: { title: string; startTime: string | null; isAllDay: boolean }[];
  tomorrowEvents: { title: string; startTime: string | null; isAllDay: boolean }[];
  overdueTasks: { title: string; dueDate: Date | null }[];
  todayTasks: { title: string; priority: string }[];
  loansComingDue: { personName: string; remainingAmount: number; dueDate: Date }[];
  budgetAlerts: { categoryName: string; pct: number; spent: number; allocated: number }[];
  emergencyMonthsCovered: number;
  daysLeftInMonth: number;
  monthIncome: number;
  monthExpenses: number;
  noIncomeRecorded: boolean;
  autoReconciledSurplus?: number;
  symbol?: string;
}) {
  const symbol = data.symbol ?? "Rs";
  const fmt = (n: number) => `${symbol}&nbsp;${(n / 100).toLocaleString("en-PK")}`;
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const RED   = "#DC2626";
  const AMBER = "#B45309";
  const GREEN = "#047857";
  const BLUE  = "#1D4ED8";

  const sections: string[] = [];

  // ── Overdue tasks ──
  if (data.overdueTasks.length > 0) {
    const items = data.overdueTasks.map((t) => {
      const when = t.dueDate
        ? `<span style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:${RED};margin-left:6px">${new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>`
        : "";
      return `<tr><td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};padding:6px 0;border-bottom:1px solid ${BORDER};line-height:1.4">${t.title}${when}</td></tr>`;
    }).join("");
    sections.push(card(RED, `
      ${sectionLabel(`Overdue · ${data.overdueTasks.length} task${data.overdueTasks.length > 1 ? "s" : ""}`)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
    `));
  }

  // ── Today's schedule ──
  if (data.todayEvents.length > 0) {
    const items = data.todayEvents.map((e) => {
      const time = e.isAllDay ? "All day" : (e.startTime ?? "");
      return `<tr>
        <td width="64" style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${MUTED};padding:6px 10px 6px 0;border-bottom:1px solid ${BORDER};vertical-align:top;white-space:nowrap">${time}</td>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};padding:6px 0;border-bottom:1px solid ${BORDER};font-weight:500">${e.title}</td>
      </tr>`;
    }).join("");
    sections.push(plainCard(`
      ${sectionLabel("Today's schedule")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
    `));
  }

  // ── Tasks due today ──
  if (data.todayTasks.length > 0) {
    const items = data.todayTasks.map((t) => {
      const badge = (t.priority === "URGENT" || t.priority === "HIGH")
        ? `<span style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:600;color:${AMBER};background:#FEF3C7;padding:2px 7px;border-radius:4px;margin-left:8px;letter-spacing:0.04em">${t.priority}</span>`
        : "";
      return `<tr><td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};padding:6px 0;border-bottom:1px solid ${BORDER}">${t.title}${badge}</td></tr>`;
    }).join("");
    sections.push(plainCard(`
      ${sectionLabel("Due today")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
    `));
  }

  // ── Tomorrow's events ──
  if (data.tomorrowEvents.length > 0) {
    const items = data.tomorrowEvents.map((e) => {
      const time = e.isAllDay ? "All day" : (e.startTime ?? "");
      return `<tr>
        <td width="64" style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${MUTED};padding:6px 10px 6px 0;border-bottom:1px solid ${BORDER};white-space:nowrap">${time}</td>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${MUTED};padding:6px 0;border-bottom:1px solid ${BORDER}">${e.title}</td>
      </tr>`;
    }).join("");
    sections.push(plainCard(`
      ${sectionLabel("Tomorrow")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
    `));
  }

  // ── Loans coming due ──
  if (data.loansComingDue.length > 0) {
    const items = data.loansComingDue.map((l) => {
      const daysUntil = Math.max(0, Math.ceil((new Date(l.dueDate).getTime() - Date.now()) / 86400000));
      return `<tr>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};padding:6px 0;border-bottom:1px solid ${BORDER};font-weight:500">${l.personName}</td>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};padding:6px 0;border-bottom:1px solid ${BORDER};text-align:right">${fmt(l.remainingAmount)}</td>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${AMBER};padding:6px 0 6px 12px;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap">${daysUntil}d left</td>
      </tr>`;
    }).join("");
    sections.push(card(AMBER, `
      ${sectionLabel("Loans due soon")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
    `));
  }

  // ── Budget alerts ──
  if (data.budgetAlerts.length > 0) {
    const items = data.budgetAlerts.map((a) => {
      const color = a.pct >= 100 ? RED : AMBER;
      const status = a.pct >= 100
        ? `<span style="color:${RED}">Exceeded</span>`
        : `<span style="color:${AMBER}">${a.pct}%</span>`;
      return `<tr>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};padding:6px 0;border-bottom:1px solid ${BORDER}">${a.categoryName}</td>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;padding:6px 0;border-bottom:1px solid ${BORDER};text-align:right">${status}</td>
        <td style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${color};padding:6px 0 6px 12px;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap">
          ${a.pct >= 100 ? `+${fmt(a.spent - a.allocated)}` : `${fmt(Math.max(0, a.allocated - a.spent))} left`}
        </td>
      </tr>`;
    }).join("");
    sections.push(card(AMBER, `
      ${sectionLabel("Budget alerts")}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
    `));
  }

  // ── Emergency fund ──
  if (data.emergencyMonthsCovered < 3) {
    sections.push(card(RED, `
      ${sectionLabel("Emergency fund")}
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};margin:0;line-height:1.6">
        Only <strong>${data.emergencyMonthsCovered.toFixed(1)} months</strong> covered - target is 9 months.
        Top up your emergency fund when possible.
      </p>
    `));
  }

  // ── No income recorded ──
  if (data.noIncomeRecorded) {
    sections.push(card(BLUE, `
      ${sectionLabel("Income")}
      <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:13px;color:${TEXT};margin:0;line-height:1.6">
        No income recorded this month yet. It's past the 5th - did you forget to log your salary?
      </p>
    `));
  }

  // ── Month wrap-up ──
  if (data.daysLeftInMonth <= 7 && data.monthIncome > 0) {
    const net = data.monthIncome - data.monthExpenses;
    const netColor = net >= 0 ? GREEN : RED;
    const netLabel = net >= 0 ? "Saved" : "Deficit";
    sections.push(card(GREEN, `
      ${sectionLabel(`Month wrap-up · ${data.daysLeftInMonth} day${data.daysLeftInMonth !== 1 ? "s" : ""} left`)}
      ${statTable(
        row("Income",   fmt(data.monthIncome)) +
        row("Expenses", fmt(data.monthExpenses)) +
        row(netLabel,   (net >= 0 ? "+" : "−") + fmt(Math.abs(net)), netColor)
      )}
    `));
  }

  const hasContent = sections.length > 0;
  const bodyContent = hasContent
    ? sections.join("")
    : plainCard(`<p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${MUTED};margin:0;text-align:center;padding:8px 0">Nothing urgent today - you're all clear.</p>`);

  const body = `
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${TEXT};margin:0 0 2px">Good morning, ${data.name}.</p>
    <p style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${FAINT};margin:0 0 24px">${dateLabel}</p>
    ${bodyContent}
  `;

  return shell(`Your daily briefing - ${dateLabel}.`, body);
}
