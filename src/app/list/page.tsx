"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ChevronDown, X, Phone, Pencil, Trash2, MoreVertical, StickyNote } from "lucide-react";
import { cn } from "@/lib/cn";
import { getCategoryEmoji } from "@/lib/constants";

interface Restaurant {
  id: number;
  nameKor: string;
  nameEng: string | null;
  locationNorm: string;
  categoryNorm: string;
  categoryRaw: string | null;
  tel: string | null;
  address: string;
  district: string | null;
  publicDesc: string | null;
  imageUrl: string | null;
  rating: string | null;
  catchtableAlias: string | null;
  catchtableMatched: boolean;
  internalMemo?: string | null;
}

export default function ListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("list_cat") || "all";
    return "all";
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("list_dist") || "all";
    return "all";
  });
  const [selectedLocation, setSelectedLocation] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("list_loc") || "all";
    return "all";
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("list_q") || "";
    return "";
  });
  const [showFilters, setShowFilters] = useState(true);
  const [memoQuery, setMemoQuery] = useState("");
  const [showMemoSearch, setShowMemoSearch] = useState(false);
  const scrollRestoredRef = useRef(false);

  // 필터 상태 persist
  useEffect(() => {
    sessionStorage.setItem("list_cat", selectedCategory);
    sessionStorage.setItem("list_dist", selectedDistrict);
    sessionStorage.setItem("list_loc", selectedLocation);
    sessionStorage.setItem("list_q", searchQuery);
  }, [selectedCategory, selectedDistrict, selectedLocation, searchQuery]);

  // 스크롤 위치 복원
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("list_scroll", String(window.scrollY));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!loading && !scrollRestoredRef.current && restaurants.length > 0) {
      scrollRestoredRef.current = true;
      const saved = sessionStorage.getItem("list_scroll");
      if (saved) {
        const y = parseInt(saved);
        setTimeout(() => window.scrollTo(0, y), 50);
      }
    }
  }, [loading, restaurants.length]);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data) => {
        setRestaurants(data.restaurants);
        setRole(data.role);
        setLoading(false);
      });
  }, []);

  // 업종 목록 (데이터 기반 동적 생성)
  const categoryList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of restaurants) {
      counts[r.categoryNorm] = (counts[r.categoryNorm] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ key: name, label: name, emoji: getCategoryEmoji(name), count }));
  }, [restaurants]);

  // 구 → 동 그룹 (DB district 컬럼 기반, 자동 분류)
  const districtData = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {};
    for (const r of restaurants) {
      const dist = r.district || "기타";
      if (!groups[dist]) groups[dist] = {};
      groups[dist][r.locationNorm] = (groups[dist][r.locationNorm] || 0) + 1;
    }

    return Object.entries(groups)
      .map(([district, dongMap]) => {
        const dongs = Object.entries(dongMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        return { district, dongs, total: dongs.reduce((s, d) => s + d.count, 0) };
      })
      .sort((a, b) => b.total - a.total);
  }, [restaurants]);

  const filtered = useMemo(() => {
    return restaurants.filter((r) => {
      if (selectedCategory !== "all" && r.categoryNorm !== selectedCategory)
        return false;

      // 지역 필터: 동이 선택되면 동 기준, 구만 선택되면 해당 구의 식당만
      if (selectedLocation !== "all") {
        if (r.locationNorm !== selectedLocation) return false;
      } else if (selectedDistrict !== "all") {
        if ((r.district || "기타") !== selectedDistrict) return false;
      }

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

      if (memoQuery) {
        const combined = [r.internalMemo, r.publicDesc].filter(Boolean).join(" ");
        if (!combined) return false;
        try {
          const regex = new RegExp(memoQuery, "i");
          if (!regex.test(combined)) return false;
        } catch {
          if (!combined.toLowerCase().includes(memoQuery.toLowerCase()))
            return false;
        }
      }

      return true;
    });
  }, [restaurants, selectedCategory, selectedDistrict, selectedLocation, searchQuery, memoQuery]);

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedDistrict !== "all" || selectedLocation !== "all" ? 1 : 0);

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
        {/* 브랜드 타이틀 */}
        <div className="px-4 pt-3 pb-2 text-center">
          <h1 className="text-xl font-bold text-gold tracking-[0.2em]">THE GUIDE</h1>
          <span className="text-xs text-text-muted">{filtered.length}곳</span>
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
              {(selectedDistrict !== "all" || selectedLocation !== "all") && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold">
                  {selectedLocation !== "all" ? selectedLocation : selectedDistrict}
                  <button
                    onClick={() => { setSelectedDistrict("all"); setSelectedLocation("all"); }}
                    className="ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedDistrict("all");
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
                {/* 업종 (데이터 기반 동적) */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                      selectedCategory === "all"
                        ? "bg-gold/20 border border-gold text-gold"
                        : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                    )}
                  >
                    전체
                  </button>
                  {categoryList.map((cat) => (
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
                      <span className="ml-1 opacity-50">{cat.count}</span>
                    </button>
                  ))}
                </div>

                {/* 지역 — 1단: 구 */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => { setSelectedDistrict("all"); setSelectedLocation("all"); }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                      selectedDistrict === "all" && selectedLocation === "all"
                        ? "bg-gold/20 border border-gold text-gold"
                        : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                    )}
                  >
                    전체 지역
                  </button>
                  {districtData.map((d) => (
                    <button
                      key={d.district}
                      onClick={() => { setSelectedDistrict(d.district); setSelectedLocation("all"); }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                        selectedDistrict === d.district
                          ? "bg-gold/20 border border-gold text-gold"
                          : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                      )}
                    >
                      {d.district}
                      <span className="ml-1 opacity-50">{d.total}</span>
                    </button>
                  ))}
                </div>

                {/* 지역 — 2단: 동 (구 선택 시만) */}
                {selectedDistrict !== "all" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    <button
                      onClick={() => setSelectedLocation("all")}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                        selectedLocation === "all"
                          ? "bg-gold/15 border border-gold/60 text-gold"
                          : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                      )}
                    >
                      {selectedDistrict} 전체
                    </button>
                    {districtData
                      .find((d) => d.district === selectedDistrict)
                      ?.dongs.map((dong) => (
                        <button
                          key={dong.name}
                          onClick={() => setSelectedLocation(dong.name)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
                            selectedLocation === dong.name
                              ? "bg-gold/20 border border-gold text-gold"
                              : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
                          )}
                        >
                          {dong.name}
                          <span className="ml-1 opacity-50">{dong.count}</span>
                        </button>
                      ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 리스트 */}
      <div className="px-4 pt-3 flex flex-col gap-3">
        {filtered.map((r) => (
          <RestaurantCard
            key={r.id}
            restaurant={r}
            isOwner={role === "owner"}
            onDelete={(id) => {
              setRestaurants((prev) => prev.filter((x) => x.id !== id));
            }}
          />
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-text-muted text-sm">
            조건에 맞는 식당이 없습니다
          </div>
        )}
      </div>

      {/* 메모 검색 FAB — Owner 전용 */}
      {role === "owner" && (
        <>
          <AnimatePresence>
            {showMemoSearch && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-24 right-4 z-40 w-64 bg-surface border border-gold/30 rounded-2xl shadow-2xl p-3"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <StickyNote className="w-3.5 h-3.5 text-gold" />
                  <span className="text-xs text-gold font-medium">내 메모에서 찾기</span>
                </div>
                <input
                  type="text"
                  value={memoQuery}
                  onChange={(e) => setMemoQuery(e.target.value)}
                  placeholder="메모에 적어둔 단어 입력"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-gold/40"
                />
                {memoQuery && (
                  <button
                    onClick={() => setMemoQuery("")}
                    className="mt-2 text-xs text-text-muted"
                  >
                    지우기
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowMemoSearch(!showMemoSearch)}
            className={cn(
              "fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all",
              showMemoSearch || memoQuery
                ? "bg-gold text-background"
                : "bg-surface border border-border/50 text-text-muted"
            )}
          >
            <StickyNote className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}

function RestaurantCard({
  restaurant,
  isOwner,
  onDelete,
}: {
  restaurant: Restaurant;
  isOwner: boolean;
  onDelete: (id: number) => void;
}) {
  const router = useRouter();
  const emoji = getCategoryEmoji(restaurant.categoryNorm);
  const [showActions, setShowActions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`"${restaurant.nameKor}"을(를) 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, { method: "DELETE" });
      if (res.ok) onDelete(restaurant.id);
    } catch {}
    setDeleting(false);
  };

  return (
    <div className="relative">
      <motion.div
        onClick={() => router.push(`/restaurant/${restaurant.id}`)}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "flex items-center gap-3 p-4 rounded-2xl cursor-pointer",
          "bg-surface border border-border/50",
          "transition-all hover:border-gold/30",
          deleting && "opacity-50 pointer-events-none"
        )}
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface border border-border/30">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.nameKor}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              {emoji}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
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
            <span className="text-xs text-text-muted">{restaurant.categoryNorm}</span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-xs text-text-muted">{restaurant.locationNorm}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {restaurant.catchtableMatched && (
            <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
              웹예약
            </span>
          )}
          {isOwner && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1.5 rounded-full hover:bg-surface-alt transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-text-muted" />
            </button>
          )}
          {!isOwner && <ChevronRight className="w-4 h-4 text-text-muted/40" />}
        </div>
      </motion.div>

      {/* 액션 메뉴 */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-2 right-2 z-10 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
          >
            <button
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-alt transition-colors w-full"
              onClick={() => { setShowActions(false); router.push(`/restaurant/${restaurant.id}/edit`); }}
            >
              <Pencil className="w-3.5 h-3.5 text-text-muted" />
              수정
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors w-full"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
