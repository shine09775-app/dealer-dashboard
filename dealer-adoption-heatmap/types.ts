export type Dealer = {
  dealer_id: string;
  dealer_name: string;
  region: string;
  province: string;
};

export type AdoptionMetric = {
  date: string;
  dealer_id: string;
  assigned_flag: boolean;
  activated_flag: boolean;
  groups_count: number;
  active_groups_count: number;
  conversations_count: number;
};

export type BusinessMetric = {
  dealer_id: string;
  active_groups: number;
  conversations: number;
  site_created: number;
  bookings: number;
  delivered_m3: number;
  revenue: number;
  conversion_rate: number;
};

export type AdoptionScore = 0 | 1 | 2 | 3 | 4 | 5;

export type AdoptionStatusLabel =
  | "Not Assigned"
  | "Assigned"
  | "Activated"
  | "Low Activity"
  | "Medium Activity"
  | "High Activity";

export type ImpactMetricKey =
  | "active_groups"
  | "conversations"
  | "site_created"
  | "bookings"
  | "delivered_m3"
  | "revenue"
  | "conversion_rate";

export type Filters = {
  region: string;
  province: string;
  search: string;
  fromMonth: string;
  toMonth: string;
};

export type MetricScoreMap = Record<ImpactMetricKey, number>;

export type DealerInsight = {
  id: string;
  title: string;
  tone: "neutral" | "warning" | "positive";
  description: string;
};

export type TooltipState = {
  x: number;
  y: number;
  title: string;
  rows: Array<{ label: string; value: string }>;
} | null;

export type DashboardData = {
  dealers: Dealer[];
  adoptionMetrics: AdoptionMetric[];
  businessMetrics: BusinessMetric[];
  months: string[];
  regions: string[];
  provincesByRegion: Record<string, string[]>;
};
