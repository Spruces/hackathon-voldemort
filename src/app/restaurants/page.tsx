"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Filter, Search as SearchIcon } from "lucide-react";
import { CategoryTabs } from "@/components/category-tabs";
import { RestaurantCard } from "@/components/restaurant-card";
import { SearchBar } from "@/components/search-bar";
import { ModeBadge } from "@/components/mode-badge";
import type { CategoryKey } from "@/lib/constants";
import type { Restaurant, UserRole } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function RestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [role, setRole] = useState<UserRole>("viewer");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => {
        if (!r.ok) {
          router.push("/");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setRestaurants(data.restaurants);
          setRole(data.role);
        }
        setLoading(false);
      });
  }, [router]);

  // 지역 목록 (건수 내림차순) — FR-05
  const locations = useMemo(() => {
    const counts: Record<string, number> = {};
    restaurants.forEach((r) => {
      counts[r.locationNorm] = (counts[r.locationNorm] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [restaurants]);

  const filtered = useMemo(() => {
    let list = restaurants;

    if (category !== "all") {
      list = list.filter((r) => r.categoryNorm === category);
    }

    if (locationFilter) {
      list = list.filter((r) => r.locationNorm === locationFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.nameKor.toLowerCase().includes(q) ||
          (r.nameEng && r.nameEng.toLowerCase().includes(q)) ||
          r.locationNorm.includes(q) ||
          r.categoryNorm.includes(q)
      );
    }

    return list;
  }, [restaurants, category, locationFilter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold"
          >
            THE GUIDE
          </motion.h1>
          <ModeBadge
            role={role}
            previewMode={previewMode}
            onTogglePreview={role === "owner" ? () => setPreviewMode(!previewMode) : undefined}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <button
            onClick={() => setShowLocationFilter(!showLocationFilter)}
            className={cn(
              "h-12 px-3 rounded-xl border flex items-center gap-1.5",
              "transition-colors",
              locationFilter
                ? "bg-gold/10 border-gold/30 text-gold"
                : "bg-surface/60 border-border/60 text-text-secondary"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs">지역</span>
          </button>
        </div>

        {/* Location filter dropdown */}
        <AnimatePresence>
          {showLocationFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 mt-3 pb-1">
                <button
                  onClick={() => {
                    setLocationFilter(null);
                    setShowLocationFilter(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-colors",
                    !locationFilter
                      ? "bg-gold text-background border-gold"
                      : "bg-surface/60 text-text-secondary border-border/50"
                  )}
                >
                  전체
                </button>
                {locations.slice(0, 15).map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      setLocationFilter(loc.name);
                      setShowLocationFilter(false);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-colors",
                      locationFilter === loc.name
                        ? "bg-gold text-background border-gold"
                        : "bg-surface/60 text-text-secondary border-border/50"
                    )}
                  >
                    {loc.name} ({loc.count})
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3">
          <CategoryTabs selected={category} onSelect={setCategory} />
        </div>
      </header>

      {/* Owner: 신규 맛집 검색 바로가기 — FR-12 */}
      {role === "owner" && !previewMode && (
        <div className="px-5 pt-3">
          <button
            onClick={() => router.push("/search")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gold/5 border border-gold/15 text-gold text-sm font-medium hover:bg-gold/10 transition-colors"
          >
            <SearchIcon className="w-4 h-4" />
            신규 맛집 검색 (지도)
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 px-5 py-4">
        {/* Active filters display */}
        {(locationFilter || category !== "all") && (
          <div className="flex items-center gap-2 mb-3">
            {locationFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-xs border border-gold/20">
                {locationFilter}
                <button
                  onClick={() => setLocationFilter(null)}
                  className="ml-0.5 hover:text-gold-light"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setLocationFilter(null);
                setCategory("all");
                setSearch("");
              }}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              초기화
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <p className="text-text-secondary text-sm">
              조건에 맞는 식당이 없습니다.
            </p>
            <p className="text-text-muted text-xs mt-1">
              검색어나 필터를 바꿔보세요.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted px-1">
              {filtered.length}개의 식당
            </p>
            {filtered.map((restaurant, i) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                index={i}
                onClick={() => router.push(`/restaurants/${restaurant.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
