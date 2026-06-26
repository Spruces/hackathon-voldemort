"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Phone as PhoneIcon, Plus, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/constants";

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  x: string;
  y: string;
  place_url: string;
}

export default function AddRestaurantPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<KakaoPlace | null>(null);
  const [category, setCategory] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelected(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/map/search?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);

    const locationRaw = selected.address_name.split(" ").pop() || "";

    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKor: selected.place_name,
          location: locationRaw,
          category: category || "기타",
          kakaoCategory: selected.category_name || "",
          address: selected.road_address_name || selected.address_name,
          tel: selected.phone || null,
          memo: memo || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSaved(true);

        // 좌표도 업데이트
        if (selected.y && selected.x) {
          await fetch(`/api/restaurants/${data.restaurant.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: parseFloat(selected.y),
              lng: parseFloat(selected.x),
            }),
          });
        }
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-glass-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">식당 추가</h1>
        </div>
      </div>

      {/* 검색 */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface border border-border/50 flex-1">
            <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="카카오맵에서 식당 검색"
              className="bg-transparent text-sm text-text-primary outline-none w-full placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-3 rounded-2xl bg-gold text-background text-sm font-medium disabled:opacity-50"
          >
            검색
          </button>
        </div>
      </div>

      {/* 검색 결과 */}
      {results.length > 0 && !selected && (
        <div className="px-4 pt-4 flex flex-col gap-2">
          <span className="text-xs text-text-muted">{results.length}개 결과</span>
          {results.map((place) => (
            <motion.button
              key={place.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(place)}
              className="flex items-start gap-3 p-4 rounded-2xl bg-surface border border-border/50 text-left transition-all hover:border-gold/30"
            >
              <MapPin className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-text-primary block truncate">
                  {place.place_name}
                </span>
                <span className="text-xs text-text-muted block mt-0.5">
                  {place.road_address_name || place.address_name}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted/60">
                    {place.category_name.split(" > ").pop()}
                  </span>
                  {place.phone && (
                    <span className="text-xs text-text-muted/60 flex items-center gap-0.5">
                      <PhoneIcon className="w-3 h-3" />
                      {place.phone}
                    </span>
                  )}
                </div>
              </div>
              <Plus className="w-4 h-4 text-text-muted flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {/* 선택된 식당 — 추가 정보 입력 */}
      {selected && !saved && (
        <div className="px-4 pt-4 flex flex-col gap-4">
          {/* 선택된 식당 정보 */}
          <div className="p-4 rounded-2xl bg-surface border border-gold/30">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gold" />
              <span className="text-sm font-semibold text-text-primary">
                {selected.place_name}
              </span>
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              {selected.road_address_name || selected.address_name}
            </span>
            {selected.phone && (
              <span className="text-xs text-text-muted mt-0.5 block">
                {selected.phone}
              </span>
            )}
          </div>

          {/* 업종 선택 */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">업종 선택</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs transition-all",
                    category === cat.key
                      ? "bg-gold/20 border border-gold text-gold"
                      : "bg-surface/80 border border-border text-text-secondary"
                  )}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-xs text-text-muted mb-2 block">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="사장님만 볼 수 있는 메모"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-surface border border-border/50 text-sm text-text-primary outline-none resize-none placeholder:text-text-muted focus:border-gold/30"
            />
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={saving || !category}
            className="w-full py-3.5 rounded-2xl bg-gold text-background font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? "저장 중..." : "리스트에 추가"}
          </button>

          <button
            onClick={() => setSelected(null)}
            className="text-xs text-text-muted text-center"
          >
            다른 식당 선택
          </button>
        </div>
      )}

      {/* 저장 완료 */}
      {saved && (
        <div className="px-4 pt-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
            <Check className="w-8 h-8 text-gold" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">추가 완료</p>
            <p className="text-sm text-text-muted mt-1">
              {selected?.place_name}이(가) 리스트에 추가되었습니다
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setSelected(null);
                setSaved(false);
                setQuery("");
                setResults([]);
                setCategory("");
                setMemo("");
              }}
              className="px-6 py-2.5 rounded-full bg-surface border border-border text-sm text-text-primary"
            >
              추가 더 하기
            </button>
            <a
              href="/list"
              className="px-6 py-2.5 rounded-full bg-gold text-background text-sm font-medium"
            >
              리스트 보기
            </a>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {results.length === 0 && !selected && !searching && (
        <div className="px-4 pt-16 text-center">
          <p className="text-text-muted text-sm">
            카카오맵에서 식당을 검색하면<br />주소·전화·좌표가 자동으로 채워집니다
          </p>
        </div>
      )}
    </div>
  );
}
