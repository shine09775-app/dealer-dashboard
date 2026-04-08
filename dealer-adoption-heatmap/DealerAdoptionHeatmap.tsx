import React, { useState } from "react";

import { mockDashboardData } from "./mockData";
import type {
  AdoptionMetric,
  Dealer,
  Filters,
  ImpactMetricKey,
  TooltipState,
} from "./types";
import {
  computeAdoptionScore,
  detectInsights,
  filterDealers,
  formatCurrency,
  formatNumber,
  getAdoptionColor,
  getAdoptionStatusLabel,
  getImpactCellColor,
  getMonthRange,
  impactColumns,
  latestMetricByDealer,
  normalizeBusinessMetrics,
} from "./utils";

type SortDirection = "asc" | "desc";

type FilterBarProps = {
  months: string[];
  regions: string[];
  provinces: string[];
  value: Filters;
  onChange: (next: Filters) => void;
  onApply: () => void;
};

type SummaryCardProps = {
  label: string;
  value: string;
  caption: string;
};

type TooltipCardProps = {
  tooltip: TooltipState;
};

type HeatmapCellProps = {
  colorClass: string;
  textClass?: string;
  onMouseEnter: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
  className?: string;
};

type HeatmapGridProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
};

type DealerRowProps = {
  dealer: Dealer;
  stickyClassName?: string;
  dealerBadge?: React.ReactNode;
  cells: React.ReactNode;
  muted?: boolean;
};

type RegionGroupHeaderProps = {
  region: string;
  count: number;
  colSpan: number;
};

function FilterBar({ months, regions, provinces, value, onChange, onApply }: FilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Region</span>
          <select
            value={value.region}
            onChange={(event) => onChange({ ...value, region: event.target.value, province: "" })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
          >
            <option value="">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Province</span>
          <select
            value={value.province}
            onChange={(event) => onChange({ ...value, province: event.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
          >
            <option value="">All Provinces</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">From Month</span>
          <select
            value={value.fromMonth}
            onChange={(event) => onChange({ ...value, fromMonth: event.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">To Month</span>
          <select
            value={value.toMonth}
            onChange={(event) => onChange({ ...value, toMonth: event.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 xl:col-span-2">
          <span className="text-xs font-medium text-slate-500">Dealer Search</span>
          <div className="flex gap-2">
            <input
              value={value.search}
              onChange={(event) => onChange({ ...value, search: event.target.value })}
              placeholder="Search dealer, region, or province"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-400"
            />
            <button
              type="button"
              onClick={onApply}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
            >
              Apply
            </button>
          </div>
        </label>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, caption }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{caption}</div>
    </div>
  );
}

function TooltipCard({ tooltip }: TooltipCardProps) {
  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      <div className="font-semibold text-slate-900">{tooltip.title}</div>
      <div className="mt-2 space-y-1">
        {tooltip.rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-6 text-slate-600">
            <span>{row.label}</span>
            <span className="font-medium text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapCell({
  colorClass,
  textClass = "text-slate-900",
  onMouseEnter,
  onMouseLeave,
  children,
  className = "",
}: HeatmapCellProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex h-12 items-center justify-center rounded-lg border border-white/60 px-2 text-xs font-medium ${colorClass} ${textClass} ${className}`}
    >
      {children}
    </div>
  );
}

function HeatmapGrid({ title, description, children, rightContent }: HeatmapGridProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {rightContent ? <div>{rightContent}</div> : null}
      </div>
      {children}
    </section>
  );
}

function DealerRow({ dealer, stickyClassName = "", dealerBadge, cells, muted }: DealerRowProps) {
  return (
    <tr className={muted ? "opacity-80" : ""}>
      <td className={`sticky left-0 z-10 min-w-[220px] border-b border-slate-100 bg-white px-4 py-3 ${stickyClassName}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-slate-900">{dealer.dealer_name}</div>
            <div className="text-xs text-slate-500">
              {dealer.province} · {dealer.region}
            </div>
          </div>
          {dealerBadge}
        </div>
      </td>
      {cells}
    </tr>
  );
}

function RegionGroupHeader({ region, count, colSpan }: RegionGroupHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
      >
        {region} · {count} dealers
      </td>
    </tr>
  );
}

export function DealerAdoptionHeatmap() {
  const { dealers, adoptionMetrics, businessMetrics, months, regions, provincesByRegion } = mockDashboardData;
  const [draftFilters, setDraftFilters] = useState<Filters>({
    region: "",
    province: "",
    search: "",
    fromMonth: months[0],
    toMonth: months[months.length - 1],
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    region: "",
    province: "",
    search: "",
    fromMonth: months[0],
    toMonth: months[months.length - 1],
  });
  const [sortKey, setSortKey] = useState<ImpactMetricKey>("revenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const provinceOptions = draftFilters.region
    ? provincesByRegion[draftFilters.region] ?? []
    : [...new Set(Object.values(provincesByRegion).flat())];
  const scopedDealers = filterDealers(dealers, {
    region: appliedFilters.region,
    province: appliedFilters.province,
    search: appliedFilters.search,
  });
  const scopedDealerIds = new Set(scopedDealers.map((dealer) => dealer.dealer_id));
  const monthWindow = getMonthRange(months, appliedFilters.fromMonth, appliedFilters.toMonth);
  const scopedAdoptionMetrics = adoptionMetrics.filter(
    (metric) => scopedDealerIds.has(metric.dealer_id) && monthWindow.includes(metric.date),
  );
  const scopedBusinessMetrics = businessMetrics.filter((metric) => scopedDealerIds.has(metric.dealer_id));
  const adoptionLookup = scopedAdoptionMetrics.reduce<Record<string, AdoptionMetric>>((acc, metric) => {
    acc[`${metric.dealer_id}:${metric.date}`] = metric;
    return acc;
  }, {});
  const latestMetrics = latestMetricByDealer(scopedAdoptionMetrics);
  const normalizedScores = normalizeBusinessMetrics(scopedBusinessMetrics);
  const sortedBusinessRows = [...scopedBusinessMetrics].sort((left, right) => {
    const delta = left[sortKey] - right[sortKey];
    return sortDirection === "asc" ? delta : -delta;
  });
  const topDealerIds = new Set(sortedBusinessRows.slice(0, 10).map((row) => row.dealer_id));
  const insights = detectInsights(scopedDealers, latestMetrics, scopedBusinessMetrics, normalizedScores);

  const totalRevenue = scopedBusinessMetrics.reduce((sum, metric) => sum + metric.revenue, 0);
  const totalVolume = scopedBusinessMetrics.reduce((sum, metric) => sum + metric.delivered_m3, 0);
  const activatedDealers = scopedDealers.filter((dealer) => latestMetrics[dealer.dealer_id]?.activated_flag).length;
  const activeDealers = scopedDealers.filter((dealer) => {
    const latest = latestMetrics[dealer.dealer_id];
    return computeAdoptionScore(latest) >= 3;
  }).length;
  const activatedRate = scopedDealers.length > 0 ? activatedDealers / scopedDealers.length : 0;
  const activeRate = scopedDealers.length > 0 ? activeDealers / scopedDealers.length : 0;

  function showTooltip(
    event: React.MouseEvent<HTMLDivElement>,
    title: string,
    rows: Array<{ label: string; value: string }>,
  ) {
    setTooltip({
      x: event.clientX + 16,
      y: event.clientY + 16,
      title,
      rows,
    });
  }

  function clearTooltip() {
    setTooltip(null);
  }

  function onApplyFilters() {
    setAppliedFilters(draftFilters);
  }

  function onSort(nextKey: ImpactMetricKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("desc");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">CPAC Dashboard</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dealer Adoption Heatmap</h1>
          <p className="text-sm text-slate-500">Rollout → Activation → Business Impact</p>
        </header>

        <FilterBar
          months={months}
          regions={regions}
          provinces={provinceOptions}
          value={draftFilters}
          onChange={setDraftFilters}
          onApply={onApplyFilters}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <HeatmapGrid
              title="1. Rollout & Activation Heatmap"
              description="Monthly view of assignment, activation, and dealer activity for the last 6 months."
              rightContent={
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Sticky dealer column · Region grouped · 6 month window
                </div>
              }
            >
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-[980px] w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20 bg-slate-50">
                    <tr>
                      <th className="sticky left-0 z-30 min-w-[220px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Dealer
                      </th>
                      {monthWindow.map((month) => (
                        <th
                          key={month}
                          className="border-b border-slate-200 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {month}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {regions.map((region) => {
                      const regionDealers = scopedDealers.filter((dealer) => dealer.region === region);
                      if (regionDealers.length === 0) return null;

                      return (
                        <React.Fragment key={region}>
                          <RegionGroupHeader region={region} count={regionDealers.length} colSpan={monthWindow.length + 1} />
                          {regionDealers.map((dealer) => (
                            <DealerRow
                              key={dealer.dealer_id}
                              dealer={dealer}
                              stickyClassName="bg-white"
                              muted={computeAdoptionScore(latestMetrics[dealer.dealer_id]) <= 1}
                              cells={monthWindow.map((month) => {
                                const metric = adoptionLookup[`${dealer.dealer_id}:${month}`];
                                const score = computeAdoptionScore(metric);
                                const label = getAdoptionStatusLabel(score);
                                const textClass = score >= 4 ? "text-white" : "text-slate-900";

                                return (
                                  <td key={`${dealer.dealer_id}:${month}`} className="border-b border-slate-100 px-3 py-2">
                                    <HeatmapCell
                                      colorClass={getAdoptionColor(score)}
                                      textClass={textClass}
                                      onMouseEnter={(event) =>
                                        showTooltip(event, `${dealer.dealer_name} · ${month}`, [
                                          { label: "Status", value: label },
                                          { label: "Groups Count", value: formatNumber(metric?.groups_count ?? 0) },
                                          { label: "Active Groups", value: formatNumber(metric?.active_groups_count ?? 0) },
                                          { label: "Conversations", value: formatNumber(metric?.conversations_count ?? 0) },
                                        ])
                                      }
                                      onMouseLeave={clearTooltip}
                                    >
                                      {score}
                                    </HeatmapCell>
                                  </td>
                                );
                              })}
                            />
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {[0, 1, 2, 3, 4, 5].map((score) => (
                  <div key={score} className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded ${getAdoptionColor(score as 0 | 1 | 2 | 3 | 4 | 5)}`} />
                    <span>
                      {score}: {getAdoptionStatusLabel(score as 0 | 1 | 2 | 3 | 4 | 5)}
                    </span>
                  </div>
                ))}
              </div>
            </HeatmapGrid>

            <HeatmapGrid
              title="2. Business Impact Heatmap"
              description="Normalized business outcomes by dealer across active groups, conversations, created sites, bookings, volume, revenue, and conversion."
              rightContent={
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Sortable columns · Top 10 highlighted · 0–100 normalization
                </div>
              }
            >
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-[1180px] w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20 bg-slate-50">
                    <tr>
                      <th className="sticky left-0 z-30 min-w-[220px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Dealer
                      </th>
                      {impactColumns.map((column) => (
                        <th key={column.key} className="border-b border-slate-200 px-3 py-3">
                          <button
                            type="button"
                            onClick={() => onSort(column.key)}
                            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900"
                          >
                            {column.label}
                            <span className="text-[10px] text-slate-400">
                              {sortKey === column.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBusinessRows.map((metric) => {
                      const dealer = scopedDealers.find((item) => item.dealer_id === metric.dealer_id);
                      if (!dealer) return null;

                      const scoreMap = normalizedScores[metric.dealer_id];
                      const isTopDealer = topDealerIds.has(metric.dealer_id);

                      return (
                        <DealerRow
                          key={metric.dealer_id}
                          dealer={dealer}
                          stickyClassName={isTopDealer ? "bg-emerald-50" : "bg-white"}
                          dealerBadge={
                            isTopDealer ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                                Top 10
                              </span>
                            ) : null
                          }
                          cells={impactColumns.map((column) => {
                            const score = scoreMap[column.key];
                            const rawValue = metric[column.key];
                            const displayValue = column.formatter ? column.formatter(rawValue) : formatNumber(rawValue);

                            return (
                              <td key={`${metric.dealer_id}:${column.key}`} className="border-b border-slate-100 px-3 py-2">
                                <HeatmapCell
                                  colorClass={getImpactCellColor(score)}
                                  onMouseEnter={(event) =>
                                    showTooltip(event, `${dealer.dealer_name} · ${column.label}`, [
                                      { label: "Raw Value", value: displayValue },
                                      { label: "Normalized Score", value: `${score}/100` },
                                    ])
                                  }
                                  onMouseLeave={clearTooltip}
                                  className="flex-col gap-0.5"
                                >
                                  <span className="text-[11px] font-semibold">{displayValue}</span>
                                  <span className="text-[10px] font-medium opacity-75">{score}</span>
                                </HeatmapCell>
                              </td>
                            );
                          })}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <div className="font-medium text-slate-600">Impact Score</div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-red-100" />
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-amber-100" />
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-emerald-200" />
                  <span>High</span>
                </div>
              </div>
            </HeatmapGrid>
          </div>

          <aside className="space-y-4">
            <SummaryCard
              label="Total Dealers"
              value={formatNumber(scopedDealers.length)}
              caption="Dealers included after filters"
            />
            <SummaryCard
              label="Activated Dealers"
              value={`${(activatedRate * 100).toFixed(1)}%`}
              caption={`${formatNumber(activatedDealers)} dealers activated`}
            />
            <SummaryCard
              label="Active Dealers"
              value={`${(activeRate * 100).toFixed(1)}%`}
              caption={`${formatNumber(activeDealers)} dealers with active usage`}
            />
            <SummaryCard
              label="Total Revenue"
              value={formatCurrency(totalRevenue)}
              caption="Estimated business impact from AI usage"
            />
            <SummaryCard
              label="Total Volume"
              value={`${formatNumber(totalVolume)} m³`}
              caption="Delivered concrete volume"
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Auto Insights</div>
              <div className="mt-4 space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-xl border p-3 ${
                      insight.tone === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : insight.tone === "positive"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{insight.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{insight.description}</div>
                  </div>
                ))}
                {insights.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                    No notable insight detected under current filters.
                  </div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <TooltipCard tooltip={tooltip} />
    </div>
  );
}

export default DealerAdoptionHeatmap;
