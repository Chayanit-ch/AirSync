import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoricalAQIData } from "../../types";
import { useTranslation } from "../../hooks/useTranslation";

type ChartMode = "line" | "bar";

export function AqiTrendChart({ data }: { data: HistoricalAQIData[] }) {
  const [mode, setMode] = useState<ChartMode>("line");
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">{t("home.trendTitle")}</h2>
        <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("line")}
            className={`rounded-full px-3 py-1 transition-colors ${
              mode === "line"
                ? "bg-brand-100 text-brand-700"
                : "text-gray-400"
            }`}
          >
            {t("home.trendLine")}
          </button>
          <button
            type="button"
            onClick={() => setMode("bar")}
            className={`rounded-full px-3 py-1 transition-colors ${
              mode === "bar"
                ? "bg-brand-100 text-brand-700"
                : "text-gray-400"
            }`}
          >
            {t("home.trendBar")}
          </button>
        </div>
      </div>

      <div className="mt-3 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "line" ? (
            <LineChart
              data={data}
              margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value}`, "AQI"]}
                labelFormatter={(label) => t("home.trendTimeLabel", { label })}
              />
              <Line
                type="monotone"
                dataKey="aqi"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value}`, "AQI"]}
                labelFormatter={(label) => t("home.trendTimeLabel", { label })}
              />
              <Bar dataKey="aqi" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
