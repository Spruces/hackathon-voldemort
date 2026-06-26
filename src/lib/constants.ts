export const CATEGORIES = [
  { key: "all", label: "전체", emoji: "" },
  { key: "한식", label: "한식", emoji: "🍚" },
  { key: "일식", label: "일식", emoji: "🍣" },
  { key: "이탈리안", label: "이탈리안", emoji: "🍝" },
  { key: "중식", label: "중식", emoji: "🥡" },
  { key: "프렌치", label: "프렌치", emoji: "🥐" },
  { key: "아메리칸·양식", label: "아메리칸·양식", emoji: "🍔" },
  { key: "아시안·기타", label: "아시안·기타", emoji: "🌏" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export function getCategoryEmoji(category: string): string {
  const found = CATEGORIES.find((c) => c.key === category);
  return found?.emoji || "🍽";
}

// 카카오맵 category_name → 대표 업종 자동 매핑
// "음식점 > 일식 > 초밥,롤" → "일식"
// "음식점 > 양식 > 이탈리안" → "이탈리안"
export function parseCategoryFromKakao(categoryName: string): string {
  const parts = categoryName.split(">").map((s) => s.trim());
  const sub = parts[1] || "";
  const detail = parts[2] || "";

  if (sub.includes("일식") || detail.includes("일식")) return "일식";
  if (detail.includes("이탈리") || sub.includes("이탈리")) return "이탈리안";
  if (detail.includes("프랑스") || detail.includes("프렌치")) return "프렌치";
  if (sub.includes("중식") || detail.includes("중국")) return "중식";
  if (sub.includes("한식") || detail.includes("한식")) return "한식";
  if (sub.includes("양식")) return "아메리칸·양식";
  if (sub.includes("퓨전")) return detail.includes("한식") ? "한식" : "아메리칸·양식";
  if (sub.includes("분식") || sub.includes("육류") || sub.includes("국밥") || sub.includes("찜")) return "한식";
  return "아시안·기타";
}

export const CATEGORY_NORM_MAP: Record<string, string> = {
  Korean: "한식",
  한식: "한식",
  고기집: "한식",
  돼지고기: "한식",
  샤브샤브: "한식",
  "한우 오마카세": "한식",
  "양 고기집": "한식",
  닭고기: "한식",
  정육식당: "한식",
  횟집: "한식",
  전골: "한식",
  Sushi: "일식",
  일식: "일식",
  이자카야: "일식",
  "일식 소바": "일식",
  "일식 스끼야끼": "일식",
  "장어덮밥(히쯔마부시)": "일식",
  "일식 오마카세": "일식",
  Italian: "이탈리안",
  Pizza: "이탈리안",
  Chinese: "중식",
  French: "프렌치",
  American: "아메리칸·양식",
  Steak: "아메리칸·양식",
  Seafood: "아메리칸·양식",
  "American·Wine": "아메리칸·양식",
  "American/Asian": "아메리칸·양식",
  Spanish: "아메리칸·양식",
  "Fine Dining": "아메리칸·양식",
  "Italian/Steak": "아메리칸·양식",
  Mexican: "아시안·기타",
  Asian: "아시안·기타",
  Indian: "아시안·기타",
  Thai: "아시안·기타",
};

export const LOCATION_NORM_MAP: Record<string, string> = {
  청당동: "청담동",
  도곡: "도곡동",
  종로: "종로구",
  "한남동/이태원": "한남동",
  "서울역/마포": "서울역",
};

