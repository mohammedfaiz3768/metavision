"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface DataPoint {
  region: string;
  users: number;
}

interface RegionBreakdownChartProps {
  data: DataPoint[];
}

export function RegionBreakdownChart({ data }: RegionBreakdownChartProps) {
  return (
    <div className="h-72 w-full text-xs font-mono select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <XAxis dataKey="region" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              borderColor: "#E5E7EB",
              borderRadius: "8px",
              color: "#111827",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            }}
          />
          <Bar
            dataKey="users"
            name="Teammates Count"
            fill="#06B6D4"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
