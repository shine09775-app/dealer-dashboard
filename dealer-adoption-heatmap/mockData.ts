import type { AdoptionMetric, BusinessMetric, DashboardData, Dealer } from "./types";

const provincesByRegion: Record<string, string[]> = {
  "Central Metro": ["Bangkok", "Nonthaburi", "Pathum Thani", "Samut Prakan"],
  East: ["Chonburi", "Rayong", "Chanthaburi", "Chachoengsao"],
  North: ["Chiang Mai", "Chiang Rai", "Lampang", "Phitsanulok"],
  Northeast: ["Khon Kaen", "Udon Thani", "Nakhon Ratchasima", "Ubon Ratchathani"],
};

const regions = Object.keys(provincesByRegion);

type DealerSegment = "inactive" | "assigned_only" | "activated_idle" | "growing" | "high_adoption_low_business" | "top_performer";

const segmentPool: DealerSegment[] = [
  ...Array.from({ length: 8 }, () => "inactive"),
  ...Array.from({ length: 8 }, () => "assigned_only"),
  ...Array.from({ length: 8 }, () => "activated_idle"),
  ...Array.from({ length: 10 }, () => "growing"),
  ...Array.from({ length: 8 }, () => "high_adoption_low_business"),
  ...Array.from({ length: 8 }, () => "top_performer"),
];

function seeded(index: number, salt: number) {
  const x = Math.sin(index * 97 + salt * 13) * 10000;
  return x - Math.floor(x);
}

function recentMonths(count: number) {
  const anchor = new Date(2026, 3, 1);
  return Array.from({ length: count }, (_, idx) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - (count - idx - 1), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function buildDealer(index: number): Dealer {
  const region = regions[index % regions.length];
  const provinceList = provincesByRegion[region];
  const province = provinceList[index % provinceList.length];
  const regionCode = region
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return {
    dealer_id: `DLR-${String(index + 1).padStart(3, "0")}`,
    dealer_name: `${regionCode} Dealer ${String(index + 1).padStart(2, "0")}`,
    region,
    province,
  };
}

function adoptionPattern(segment: DealerSegment, monthIndex: number, dealerIndex: number) {
  const baseGroups = 2 + Math.floor(seeded(dealerIndex, 1) * 5);
  const rolloutMonth = segment === "inactive" ? 5 : Math.floor(seeded(dealerIndex, 2) * 2);
  const activationMonth =
    segment === "assigned_only" || segment === "inactive"
      ? 99
      : rolloutMonth + 1 + Math.floor(seeded(dealerIndex, 3) * 2);

  const assigned = monthIndex >= rolloutMonth;
  const activated = assigned && monthIndex >= activationMonth;

  if (!assigned) {
    return {
      assigned_flag: false,
      activated_flag: false,
      groups_count: 0,
      active_groups_count: 0,
      conversations_count: 0,
    };
  }

  if (!activated) {
    return {
      assigned_flag: true,
      activated_flag: false,
      groups_count: baseGroups,
      active_groups_count: 0,
      conversations_count: 0,
    };
  }

  if (segment === "activated_idle") {
    return {
      assigned_flag: true,
      activated_flag: true,
      groups_count: baseGroups,
      active_groups_count: 0,
      conversations_count: 0,
    };
  }

  if (segment === "growing") {
    const ramp = Math.max(0, monthIndex - activationMonth + 1);
    const activeGroups = Math.min(baseGroups, 1 + ramp);
    const conversations = 8 + ramp * 18 + Math.floor(seeded(dealerIndex, monthIndex + 4) * 16);
    return {
      assigned_flag: true,
      activated_flag: true,
      groups_count: baseGroups,
      active_groups_count: activeGroups,
      conversations_count: conversations,
    };
  }

  if (segment === "high_adoption_low_business") {
    const ramp = Math.max(1, monthIndex - activationMonth + 2);
    const activeGroups = Math.min(baseGroups, Math.max(2, baseGroups - 1));
    const conversations = 65 + ramp * 12 + Math.floor(seeded(dealerIndex, monthIndex + 5) * 22);
    return {
      assigned_flag: true,
      activated_flag: true,
      groups_count: baseGroups + 1,
      active_groups_count: activeGroups,
      conversations_count: conversations,
    };
  }

  if (segment === "top_performer") {
    const ramp = Math.max(1, monthIndex - activationMonth + 2);
    const activeGroups = Math.min(baseGroups + 2, 3 + ramp);
    const conversations = 110 + ramp * 24 + Math.floor(seeded(dealerIndex, monthIndex + 6) * 30);
    return {
      assigned_flag: true,
      activated_flag: true,
      groups_count: baseGroups + 2,
      active_groups_count: activeGroups,
      conversations_count: conversations,
    };
  }

  return {
    assigned_flag: true,
    activated_flag: true,
    groups_count: baseGroups,
    active_groups_count: 0,
    conversations_count: 0,
  };
}

function buildBusinessMetric(segment: DealerSegment, dealer: Dealer, latest: AdoptionMetric, dealerIndex: number): BusinessMetric {
  const activityMultiplier = latest.conversations_count + latest.active_groups_count * 10;

  const baseSiteCreated =
    segment === "inactive" || segment === "assigned_only" || segment === "activated_idle"
      ? Math.floor(latest.conversations_count * 0.04)
      : segment === "high_adoption_low_business"
        ? Math.floor(latest.conversations_count * 0.08)
        : segment === "top_performer"
          ? Math.floor(latest.conversations_count * 0.24)
          : Math.floor(latest.conversations_count * 0.16);

  const bookings =
    segment === "high_adoption_low_business"
      ? Math.max(0, Math.floor(baseSiteCreated * 0.18))
      : segment === "top_performer"
        ? Math.max(1, Math.floor(baseSiteCreated * 0.58))
        : Math.max(0, Math.floor(baseSiteCreated * 0.34));

  const delivered = bookings * (18 + Math.floor(seeded(dealerIndex, 10) * 22));
  const ratePerM3 =
    dealer.region === "Central Metro"
      ? 2200
      : dealer.region === "East"
        ? 2050
        : dealer.region === "North"
          ? 1980
          : 1920;
  const revenue = delivered * ratePerM3;
  const conversionRate = latest.conversations_count > 0 ? bookings / latest.conversations_count : 0;

  return {
    dealer_id: dealer.dealer_id,
    active_groups: latest.active_groups_count,
    conversations: latest.conversations_count + activityMultiplier,
    site_created: baseSiteCreated,
    bookings,
    delivered_m3: delivered,
    revenue,
    conversion_rate: Number(conversionRate.toFixed(3)),
  };
}

export function generateDashboardData(): DashboardData {
  const months = recentMonths(6);
  const dealers = Array.from({ length: 50 }, (_, idx) => buildDealer(idx));
  const adoptionMetrics: AdoptionMetric[] = [];
  const businessMetrics: BusinessMetric[] = [];

  dealers.forEach((dealer, index) => {
    const segment = segmentPool[index];
    const dealerMetrics: AdoptionMetric[] = months.map((month, monthIndex) => {
      const pattern = adoptionPattern(segment, monthIndex, index);
      return {
        date: month,
        dealer_id: dealer.dealer_id,
        ...pattern,
      };
    });

    adoptionMetrics.push(...dealerMetrics);
    businessMetrics.push(buildBusinessMetric(segment, dealer, dealerMetrics[dealerMetrics.length - 1], index));
  });

  return {
    dealers,
    adoptionMetrics,
    businessMetrics,
    months,
    regions,
    provincesByRegion,
  };
}

export const mockDashboardData = generateDashboardData();
