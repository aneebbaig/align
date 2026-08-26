"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SpendingData {
  name: string;
  color: string;
  amount: number;
}

export function SpendingChart({ data, baseSymbol = "Rs" }: { data: SpendingData[]; baseSymbol?: string }) {
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.name,
    value: d.amount,
    color: d.color,
  }));

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Spending by Category</h3>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No expenses this month
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 overflow-hidden">
      <h3 className="font-semibold text-foreground mb-3">Spending by Category</h3>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${baseSymbol} ${(Number(value) / 100).toLocaleString()}`, ""]}
              contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
            />
            <Legend
              formatter={(value) => <span className="text-xs">{value}</span>}
              wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-1">
        <div className="text-xs text-muted-foreground">Total Spending</div>
        <div className="text-lg font-bold text-foreground">{baseSymbol} {(total / 100).toLocaleString()}</div>
      </div>
    </div>
  );
}
