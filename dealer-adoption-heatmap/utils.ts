import type {
  AdoptionMetric,
  AdoptionScore,
  AdoptionStatusLabel,
  BusinessMetric,
  Dealer,
  DealerInsight,
  Filters,
  ImpactMetricKey,
  MetricScoreMap,
} from "./types";

export const impactColumns: Array<{ key: ImpactMetricKey; label: string; formatter?: (value: number) => string }> = [
  { key: "active_groups", label: "Active Groups" },
  { key: "conversations", label: "Conversations" },
  { key: "site_created", label: "Site Created" },
  { key: "bookings", label: "Bookings" },
  { key: "delivered_m3", label: "Delivered m3" },
  { key: "revenue", label: "Revenue", formatter: formatCurrency },
  { key: "conversion_rate", label: "Conversion Rate", formatter: formatPercent },
];

export function computeAdoptionScore(metric?: AdoptionMetric): AdoptionScore {
  if (!metric || !metric.assigned_flag) return 0;
  if (metric.assigned_flag && !metric.activated_flag) return 1;
  if (metric.activated_flag && metric.active_groups_count === 0) return 2;
  if (metric.active_groups_count > 0 && metric.conversations_count < 30) return 3;
  if (metric.conversations_count < 90) return 4;
  return 5;
}

export function getAdoptionStatusLabel(score: AdoptionScore): AdoptionStatusLabel {
  switch (score) {
    case 0:
      return "Not Assigned";
    case 1:
      return "Assigned";
    case 2:
      return "Activated";
    case 3:
      return "Low Activity";
    case 4:
      return "Medium Activity";
    default:
      return "High Activity";
  }
}

export function getAdoptionColor(score: AdoptionScore) {
  switch (score) {
    case 0:
      return "bg-slate-100";
    case 1:
      return "bg-amber-100";
    case 2:
      return "bg-sky-100";
    case 3:
      return "bg-sky-300";
    case 4:
      return "bg-sky-500";
    default:
      return "bg-blue-700";
  }
}

export function getImpactCellColor(score: number) {
  if (score <= 20) return "bg-red-100 text-red-900";
  if (score <= 40) return "bg-red-50 text-red-800";
  if (score <= 60) return "bg-amber-100 text-amber-900";
  if (score <= 80) return "bg-lime-100 text-lime-900";
  return "bg-emerald-200 text-emerald-950";
}

export function normalizeBusinessMetrics(metrics: BusinessMetric[]) {
  if (metrics.length === 0) return {};

  const rangeByMetric = impactColumns.reduce<Record<ImpactMetricKey, { min: number; max: number }>>((acc, column) => {
    const values = metrics.map((metric) => metric[column.key]);
    acc[column.key] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
    return acc;
  }, {} as Record<ImpactMetricKey, { min: number; max: number }>);

  return metrics.reduce<Record<string, MetricScoreMap>>((acc, metric) => {
    const scores = {} as MetricScoreMap;

    impactColumns.forEach((column) => {
      const current = metric[column.key];
      const range = rangeByMetric[column.key];

      if (range.max === range.min) {
        scores[column.key] = 100;
        return;
      }

      scores[column.key] = Math.round(((current - range.min) / (range.max - range.min)) * 100);
    });

    acc[metric.dealer_id] = scores;
    return acc;
  }, {});
}

export function latestMetricByDealer(metrics: AdoptionMetric[]) {
  return metrics.reduce<Record<string, AdoptionMetric>>((acc, metric) => {
    const current = acc[metric.dealer_id];
    if (!current || current.date < metric.date) {
      acc[metric.dealer_id] = metric;
    }
    return acc;
  }, {});
}

export function getMonthRange(months: string[], fromMonth: string, toMonth: string) {
  const startIndex = months.indexOf(fromMonth);
  const endIndex = months.indexOf(toMonth);
  if (startIndex === -1 || endIndex === -1) return months;
  return months.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1);
}

export function filterDealers(dealers: Dealer[], filters: Omit<Filters, "fromMonth" | "toMonth">) {
  return dealers.filter((dealer) => {
    if (filters.region && dealer.region !== filters.region) return false;
    if (filters.province && dealer.province !== filters.province) return false;
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const target = `${dealer.dealer_name} ${dealer.region} ${dealer.province}`.toLowerCase();
      if (!target.includes(query)) return false;
    }
    return true;
  });
}

export function detectInsights(
  dealers: Dealer[],
  latestMetrics: Record<string, AdoptionMetric>,
  businessMetrics: BusinessMetric[],
  normalizedScores: Record<string, MetricScoreMap>,
) {
  const businessByDealer = businessMetrics.reduce<Record<string, BusinessMetric>>((acc, metric) => {
    acc[metric.dealer_id] = metric;
    return acc;
  }, {});

  const insights: DealerInsight[] = [];

  const inactiveDealers = dealers
    .filter((dealer) => {
      const latest = latestMetrics[dealer.dealer_id];
      const score = computeAdoptionScore(latest);
      return score <= 1;
    })
    .slice(0, 3);

  if (inactiveDealers.length > 0) {
    insights.push({
      id: "inactive-dealers",
      title: "Inactive or not yet live",
      tone: "warning",
      description: inactiveDealers
        .map((dealer) => `${dealer.dealer_name} (${dealer.region})`)
        .join(", "),
    });
  }

  const highAdoptionLowBusiness = dealers
    .filter((dealer) => {
      const latest = latestMetrics[dealer.dealer_id];
      const business = businessByDealer[dealer.dealer_id];
      const normalized = normalizedScores[dealer.dealer_id];
      if (!latest || !business || !normalized) return false;
      const adoptionScore = computeAdoptionScore(latest);
      const businessBlend = (normalized.revenue + normalized.bookings + normalized.conversion_rate) / 3;
      return adoptionScore >= 4 && businessBlend < 40;
    })
    .slice(0, 3);

  if (highAdoptionLowBusiness.length > 0) {
    insights.push({
      id: "high-adoption-low-business",
      title: "High adoption but low business impact",
      tone: "neutral",
      description: highAdoptionLowBusiness
        .map((dealer) => `${dealer.dealer_name} needs conversion follow-up`)
        .join(", "),
    });
  }

  const topPerformers = [...businessMetrics]
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 3)
    .map((metric) => {
      const dealer = dealers.find((item) => item.dealer_id === metric.dealer_id);
      return dealer ? `${dealer.dealer_name} (${formatCurrency(metric.revenue)})` : null;
    })
    .filter(Boolean) as string[];

  if (topPerformers.length > 0) {
    insights.push({
      id: "top-performers",
      title: "Top performing dealers",
      tone: "positive",
      description: topPerformers.join(", "),
    });
  }

  return insights;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
