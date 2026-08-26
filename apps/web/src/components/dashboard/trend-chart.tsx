"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TrendData {
  month: string;
  income: number;
  expenses: number;
}

export function TrendChart({ data, baseSymbol = "Rs" }: { data: TrendData[]; baseSymbol?: string }) {
  const chartData = data.map((d) => ({
    name: d.month,
    Income: d.income / 100,
    Expenses: d.expenses / 100,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-4">Income vs Expenses (6 months)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={4}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${baseSymbol} ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => [`${baseSymbol} ${Number(value).toLocaleString()}`, ""]}
            contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
          />
          <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
          <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
