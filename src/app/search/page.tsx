"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Search, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  phone: string;
  place_url: string;
  x: string;
  y: string;
}

export default function SearchMapPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    // Owner 확인
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.role !== "owner") router.push("/restaurants");
      });

    // 카카오 API 키 확인
    fetch("/api/map/check")
      .then((r) => r.json())
      .then((data) => setHasApiKey(data.available))
      .catch(() => setHasApiKey(false));
  }, [router]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);

    try {
      const res = await fetch(
        `/api/map/search?query=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-5 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push("/restaurants")}
            className="w-9 h-9 rounded-full bg-surface border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold">신규 맛집 검색</h1>
            <p className="text-xs text-text-muted">
              목록에 없는 식당을 지도에서 검색해 위치를 확인할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="식당명 또는 지역으로 검색"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface/60 border border-border/60 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/40"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="h-12 px-5 rounded-xl bg-gold text-background font-medium text-sm disabled:opacity-50"
          >
            검색
          </button>
        </div>
      </header>

      {/* Info notice */}
      <div className="px-5 pt-4">
        <div className="p-3 rounded-lg bg-surface-alt/50 border border-border/30">
          <p className="text-xs text-text-secondary">
            저장은 되지 않습니다. 위치 확인 용도로만 사용하세요.
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="px-5 py-4">
        {searching && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!searching && results.length === 0 && query && (
          <div className="text-center py-10">
            <p className="text-sm text-text-secondary">
              {hasApiKey
                ? "검색 결과가 없습니다."
                : "카카오맵 API 키가 설정되지 않았습니다. 외부 검색으로 이동합니다."}
            </p>
            {!hasApiKey && (
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg bg-gold/10 text-gold text-sm border border-gold/20"
              >
                <ExternalLink className="w-4 h-4" />
                카카오맵에서 검색
              </a>
            )}
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              {results.length}개 결과
            </p>
            {results.map((place, i) => (
              <motion.a
                key={`${place.place_name}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                href={place.place_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block p-4 rounded-xl",
                  "bg-surface/60 border border-glass-border",
                  "hover:border-gold/30 transition-colors"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {place.place_name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {place.category_name}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3 h-3 text-text-muted" />
                      <p className="text-xs text-text-secondary">
                        {place.road_address_name || place.address_name}
                      </p>
                    </div>
                    {place.phone && (
                      <p className="text-xs text-text-secondary mt-1">
                        {place.phone}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
                </div>
              </motion.a>
            ))}
          </div>
        )}

        {/* Fallback: direct kakao map link when no API key */}
        {!hasApiKey && !query && (
          <div className="text-center py-10">
            <MapPin className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              식당명이나 지역을 입력하면 카카오맵에서 검색합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
