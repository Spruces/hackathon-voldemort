"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, MapPin, Phone as PhoneIcon, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/constants";

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  x: string;
  y: string;
}

interface RestaurantData {
  id: number;
  nameKor: string;
  nameEng: string | null;
  locationNorm: string;
  categoryNorm: string;
  tel: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  publicDesc: string | null;
  internalMemo: string | null;
}

export default function EditRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);

  // 편집 필드
  const [nameKor, setNameKor] = useState("");
  const [nameEng, setNameEng] = useState("");
  const [category, setCategory] = useState("");
  const [tel, setTel] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [publicDesc, setPublicDesc] = useState("");
  const [memo, setMemo] = useState("");

  // 카카오맵 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [linked, setLinked] = useState(false);

  // 저장
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const r = data.restaurant;
        setRestaurant(r);
        setNameKor(r.nameKor || "");
        setNameEng(r.nameEng || "");
        setCategory(r.categoryNorm || "");
        setTel(r.tel || "");
        setAddress(r.address || "");
        setLat(r.lat);
        setLng(r.lng);
        setPublicDesc(r.publicDesc || "");
        setMemo(r.internalMemo || "");
        setSearchQuery(r.nameKor || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setLinked(false);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/map/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlace = (place: KakaoPlace) => {
    setAddress(place.road_address_name || place.address_name);
    setTel(place.phone || "");
    setLat(parseFloat(place.y));
    setLng(parseFloat(place.x));
    setLinked(true);
    setSearchResults([]);
    setSearchQuery(place.place_name);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      await fetch(`/api/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEng: nameEng || null,
          categoryNorm: category,
          tel: tel || null,
          address,
          lat,
          lng,
          publicDesc: publicDesc || null,
          internalMemo: memo || null,
        }),
      });
      setSaved(true);
      setTimeout(() => router.push(`/restaurant/${id}`), 1000);
    } catch {}
    setSaving(false);
  };

  if (loading || !restaurant) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-text-secondary">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-glass-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">식당 수정</h1>
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* 식당명 (한글 — 읽기전용) */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">식당명 (한글)</label>
          <div className="h-12 px-4 rounded-xl bg-surface/50 border border-border/30 flex items-center text-sm text-text-secondary">
            {nameKor}
          </div>
        </div>

        {/* 식당명 (영문) */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">식당명 (영문)</label>
          <input
            type="text"
            value={nameEng}
            onChange={(e) => setNameEng(e.target.value)}
            placeholder="English name"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border/50 text-sm text-text-primary outline-none focus:border-gold/40 placeholder:text-text-muted"
          />
        </div>

        {/* 업종 */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">업종</label>
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

        {/* 카카오맵 검색 — 주소/전화/좌표 갱신 */}
        <div className="p-4 rounded-2xl bg-surface border border-border/50">
          <label className="text-xs text-text-muted mb-2 block">
            카카오맵에서 검색하여 주소·전화·좌표 갱신
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-background border border-border/50 flex-1">
              <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="카카오맵 검색"
                className="bg-transparent text-sm text-text-primary outline-none w-full placeholder:text-text-muted"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-3 py-2.5 rounded-xl bg-gold text-background text-xs font-medium disabled:opacity-50"
            >
              검색
            </button>
          </div>

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {searchResults.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-background/50 border border-border/30 text-left hover:border-gold/30 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-text-primary block truncate">
                      {place.place_name}
                    </span>
                    <span className="text-[11px] text-text-muted truncate block">
                      {place.road_address_name || place.address_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {linked && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" /> 카카오맵 정보 연결됨
            </div>
          )}
        </div>

        {/* 주소 (카카오맵에서 자동 채움 또는 직접 수정) */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">주소</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border/50 text-sm text-text-primary outline-none focus:border-gold/40"
          />
        </div>

        {/* 전화번호 */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">전화번호</label>
          <input
            type="text"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="02-000-0000"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border/50 text-sm text-text-primary outline-none focus:border-gold/40 placeholder:text-text-muted"
          />
        </div>

        {/* 좌표 (읽기전용 표시) */}
        {lat && lng && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1.5 block">위도</label>
              <div className="h-10 px-3 rounded-lg bg-surface/50 border border-border/30 flex items-center text-xs text-text-muted">
                {lat.toFixed(6)}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1.5 block">경도</label>
              <div className="h-10 px-3 rounded-lg bg-surface/50 border border-border/30 flex items-center text-xs text-text-muted">
                {lng.toFixed(6)}
              </div>
            </div>
          </div>
        )}

        {/* 소개 (임원에게 보임) */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">소개 · 안내 (임원에게 보임)</label>
          <textarea
            value={publicDesc}
            onChange={(e) => setPublicDesc(e.target.value)}
            placeholder="위치 안내, 예약 방법 등"
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-text-primary outline-none resize-none placeholder:text-text-muted focus:border-gold/40"
          />
        </div>

        {/* 메모 (나만 보기) */}
        <div>
          <label className="text-xs text-text-muted mb-1.5 block">Memo (나만 보기)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="추천인, 내부 참고사항 등"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-gold/20 text-sm text-text-primary outline-none resize-none placeholder:text-text-muted focus:border-gold/40"
          />
        </div>

        {/* 저장 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "w-full py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center gap-2",
            saved
              ? "bg-green-500/20 border border-green-500/30 text-green-400"
              : "bg-gold text-background disabled:opacity-50"
          )}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4" /> 저장 완료
            </>
          ) : saving ? (
            "저장 중..."
          ) : (
            "저장"
          )}
        </button>
      </div>
    </div>
  );
}
