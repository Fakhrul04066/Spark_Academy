"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useId } from "react";
export function PerformanceChart({
  data,
}: {
  data: { label: string; title: string; percentage: number }[];
}) {
  const id = useId().replaceAll(":", "");
  return (
    <div
      className="performance-chart"
      aria-label="Recent released examination scores"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#315f81" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#315f81" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#e8edf2"
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#526b82" }}
            dy={10}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#526b82" }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #e1e8f0",
              borderRadius: 12,
              boxShadow: "0 8px 28px #16324f12",
              fontSize: 12,
            }}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.title || "Assessment"
            }
            formatter={(value) => [`${value}%`, "Score"]}
          />
          <Area
            type="monotone"
            dataKey="percentage"
            stroke="#315f81"
            strokeWidth={3}
            fill={`url(#${id})`}
            dot={{ r: 3, fill: "#fff", stroke: "#315f81", strokeWidth: 2 }}
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ProgressChart({
  data,
}: {
  data: { subject: string; percentage: number }[];
}) {
  return (
    <div
      style={{ height: 230, width: "100%", minWidth: 0 }}
      aria-label="Subject progress chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar
            dataKey="percentage"
            fill="#16324f"
            radius={[6, 6, 0, 0]}
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
