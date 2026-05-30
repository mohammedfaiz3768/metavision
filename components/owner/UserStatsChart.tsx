"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface DataPoint {
  month: string;
  registrations: number;
}

interface UserStatsChartProps {
  data: DataPoint[];
}

export function UserStatsChart({ data }: UserStatsChartProps) {
  return (
    <div className="h-72 w-full text-xs font-mono select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(35, 100%, 55%)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(35, 100%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" stroke="#9CA3AF" />
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
          <Area
            type="monotone"
            dataKey="registrations"
            name="Registrations"
            stroke="#F59E0B"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRegistrations)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
