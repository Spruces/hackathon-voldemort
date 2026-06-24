import { execSync } from "child_process";

const CT_BIN = process.env.CT_BIN || "/tmp/ct-test/bin/ct";

interface DaySlot {
  date: string;
  availableStatus: "AVAILABLE" | "CLOSED" | string;
  availablePersonCounts: number[];
  benefit: { type: string; value: string } | null;
}

interface ShopDetail {
  shopName: string;
  shopNameEn?: string;
  lat: number;
  lon: number;
  bizHourGuide?: string;
  parkingGuide?: string;
  lunchPriceText?: string;
  dinnerPriceText?: string;
  serviceDesc?: string;
  shopPhone?: string;
  dispShopPhone?: string;
  shopAddress?: string;
  onlineYn?: string;
  onlineCatchtableUseYn?: string;
  review?: { finalScore: string; totalReviewCount: number };
  images?: Array<{ imgUrl: string }>;
}

export interface ShopInfo {
  alias: string;
  shopRef: string;
  detail: ShopDetail;
  daySlots: DaySlot[];
}

export interface SearchResult {
  code: string;
  label: string;
  subLabel: string;
  primaryCode: string;
  headImageUrl?: string;
  status: string;
}

export function searchShop(keyword: string): SearchResult[] {
  try {
    const result = execSync(`${CT_BIN} search search "${keyword}" -f json`, {
      encoding: "utf-8",
      timeout: 10000,
    });
    const data = JSON.parse(result);
    return data.data?.shops || [];
  } catch {
    return [];
  }
}

export function getShopInfo(alias: string): ShopInfo | null {
  try {
    const result = execSync(`${CT_BIN} shop info ${alias} -f json`, {
      encoding: "utf-8",
      timeout: 15000,
    });
    const data = JSON.parse(result);

    const shopDetail = data.shop?.data?.shopDetailVO;
    const daySlots = data.day_slots?.data || [];

    if (!shopDetail) return null;

    return {
      alias: data.alias,
      shopRef: data.shop_ref,
      detail: shopDetail,
      daySlots,
    };
  } catch {
    return null;
  }
}

export function getDaySlots(alias: string): DaySlot[] {
  const info = getShopInfo(alias);
  return info?.daySlots || [];
}

export function isAvailableOnDate(
  alias: string,
  date: string,
  persons?: number
): { available: boolean; personCounts: number[] } {
  const slots = getDaySlots(alias);
  const slot = slots.find((s) => s.date === date);

  if (!slot || slot.availableStatus !== "AVAILABLE") {
    return { available: false, personCounts: [] };
  }

  if (persons && !slot.availablePersonCounts.includes(persons)) {
    return { available: false, personCounts: slot.availablePersonCounts };
  }

  return { available: true, personCounts: slot.availablePersonCounts };
}
