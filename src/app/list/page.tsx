"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ChevronDown, X, Phone } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES, getCategoryEmoji } from "@/lib/constants";

interface Restaurant {
  id: number;
  nameKor: string;
  nameEng: string | null;
  locationNorm: string;
  categoryNorm: string;
  categoryRaw: string | null;
  tel: string | null;
  address: string;
  catchtableAlias: string | null;
  catchtableMatched: boolean;
}

export default function ListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data) => {
        setRestaurants(data.restaurants);
        setRole(data.role);
        setLoading(false);
      });
  }, []);

  // 지역 목록 (건수 내림차순)
  const locations = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of restaurants) {
      counts[r.locationNorm] = (counts[r.locationNorm] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [restaurants]);

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (selectedCategory !== "all" && r.categoryNorm !== selectedCategory)
        return false;
      if (selectedLocation !== "all" && r.locationNorm !== selectedLocation)
        return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !r.nameKor.toLowerCase().includes(q) &&
          !(r.nameEng || "").toLowerCase().includes(q) &&
          !r.locationNorm.toLowerCase().includes(q) &&
          !r.categoryNorm.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [restaurants, selectedCategory, selectedLocation, searchQuery]);

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedLocation !== "all" ? 1 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-text-secondary">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-16">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-10 pt-safe bg-background/95 backdrop-blur-xl border-b border-glass-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-xs px-2 py-1 rounded-full bg-surface/80 backdrop-blur border border-glass-border text-text-secondary">
            {role === "owner" ? "🛠 관리자" : "👤 임원"}
          </span>
          <span className="text-xs text-text-muted">
            {filtered.length}곳
          </span>
        </div>

        {/* 검색 + 필터 토글 */}
        <div className="px-4 pb-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface/80 backdrop-blur border border-glass-border flex-1">
              <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="식당명 · 지역 · 업종 검색"
                className="bg-transparent text-sm text-text-primary outline-none w-full placeholder:text-text-muted"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-3.5 h-3.5 text-text-muted" />
                </button>
              )}
            </div>

            {/* 필터 토글 버튼 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-full text-xs whitespace-nowrap transition-all",
                showFilters || activeFilterCount > 0
                  ? "bg-gold/20 border border-gold text-gold"
                  : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
              )}
            >
              필터
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-gold text-background text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  showFilters && "rotate-180"
                )}
              />
            </button>
          </div>

          {/* 선택된 필터 태그 (접혀있을 때도 표시) */}
          {!showFilters && activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {selectedCategory !== "all" && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold">
                  {getCategoryEmoji(selectedCategory)} {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className="ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedLocation !== "all" && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold">
                  {selectedLocation}
                  <button
                    onClick={() => setSelectedLocation("all")}
                    className="ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedLocation("all");
                }}
                className="px-2.5 py-1 rounded-full text-xs text-text-muted border border-border"
              >
                초기화
              </button>
            </div>
          )}

          {/* 펼쳐진 필터 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col gap-2"
              >
                {/* 업종 */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                        selectedCategory === cat.key
                          ? "bg-gold/20 border border-gold text-gold"
                          : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                      )}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>

                {/* 지역 */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => setSelectedLocation("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                      selectedLocation === "all"
                        ? "bg-gold/20 border border-gold text-gold"
                        : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                    )}
                  >
                    전체 지역
                  </button>
                  {locations.map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => setSelectedLocation(loc.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                        selectedLocation === loc.name
                          ? "bg-gold/20 border border-gold text-gold"
                          : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                      )}
                    >
                      {loc.name}
                      <span className="ml-1 opacity-50">{loc.count}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 리스트 */}
      <div className="px-4 pt-3 flex flex-col gap-3">
        {filtered.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-text-muted text-sm">
            조건에 맞는 식당이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const emoji = getCategoryEmoji(restaurant.categoryNorm);

  return (
    <motion.a
      href={`/restaurant/${restaurant.id}`}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl",
        "bg-surface border border-border/50",
        "transition-all hover:border-gold/30"
      )}
    >
      {/* 이모지 */}
      <div className="flex flex-col items-center justify-center min-w-[56px]">
        <span className="text-2xl">{emoji}</span>
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary truncate">
            {restaurant.nameKor}
          </span>
          {restaurant.nameEng && (
            <span className="text-xs text-text-muted/50 truncate hidden sm:inline">
              {restaurant.nameEng}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-text-muted">
            {restaurant.categoryNorm}
          </span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">
            {restaurant.locationNorm}
          </span>
        </div>
      </div>

      {/* 우측 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {restaurant.catchtableMatched ? (
          <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
            웹예약
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-surface-alt text-text-muted border border-border/50">
            <Phone className="w-3 h-3" />
            전화예약
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-text-muted/40" />
      </div>
    </motion.a>
  );
}
