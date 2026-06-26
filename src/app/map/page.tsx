"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  ChevronUp,
  ChevronDown,
  Zap,
  X,
  CalendarDays,
  Phone,
} from "lucide-react";
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
  lat: number | null;
  lng: number | null;
  district: string | null;
  imageUrl: string | null;
  rating: string | null;
  catchtableAlias: string | null;
  catchtableMatched: boolean;
}

interface ETAResult {
  id: number;
  durationMin: number;
  distanceKm: number;
}

interface AvailabilityResult {
  restaurantId: number;
  available: boolean;
  personCounts: number[];
  timeSlots: Array<{ time: string; available: boolean }> | null;
  availableTimes: string[];
}

function getDateString(date: string | null): string {
  if (!date) return new Date().toISOString().split("T")[0];
  return date;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.round((target.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  return `${target.getMonth() + 1}/${target.getDate()}`;
}

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // 위치
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState(false);

  // 필터 상태
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD or null (지금 바로)
  const [selectedPersons, setSelectedPersons] = useState(2);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNowMode, setIsNowMode] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  // 결과 상태
  const [etaMap, setEtaMap] = useState<Map<number, ETAResult>>(new Map());
  const [availMap, setAvailMap] = useState<Map<number, AvailabilityResult>>(
    new Map()
  );
  const [etaLoading, setEtaLoading] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);

  // 바텀시트
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // 지도
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 1. 데이터 로드 (+ 페이지 복귀 시 리로드)
  const loadRestaurants = useCallback(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data) => {
        setRestaurants(data.restaurants);
        setRole(data.role);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadRestaurants();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadRestaurants();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadRestaurants]);

  // 2. 위치 추적 (이동 시 자동 갱신)
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: 37.498095, lng: 127.02761 });
      setLocationError(true);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationError(false);
      },
      () => {
        setUserLocation((prev) => prev || { lat: 37.498095, lng: 127.02761 });
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 3. 카카오맵 초기화
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    if (kakaoMapRef.current) return;

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`;
    script.onload = () => {
      (window as any).kakao.maps.load(() => {
        const kakao = (window as any).kakao;
        const container = mapRef.current;
        const options = {
          center: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
          level: 7,
        };
        const map = new kakao.maps.Map(container, options);
        kakaoMapRef.current = map;

        // 현위치 마커
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
          map,
          image: new kakao.maps.MarkerImage(
            "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
            new kakao.maps.Size(24, 35)
          ),
        });

        updateMapMarkers(map, restaurants);
      });
    };
    document.head.appendChild(script);
  }, [userLocation, restaurants]);

  // 3-1. 위치 변경 시 지도 센터 이동
  useEffect(() => {
    if (!kakaoMapRef.current || !userLocation) return;
    const kakao = (window as any).kakao;
    if (!kakao) return;
    kakaoMapRef.current.setCenter(
      new kakao.maps.LatLng(userLocation.lat, userLocation.lng)
    );
  }, [userLocation]);

  // 4. 지도 마커 업데이트
  const updateMapMarkers = useCallback(
    (map: any, list: Restaurant[]) => {
      const kakao = (window as any).kakao;
      if (!kakao) return;

      // 기존 마커 제거
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      for (const r of list) {
        if (!r.lat || !r.lng) continue;

        const avail = availMap.get(r.id);
        const isAvailable = avail?.available;

        const markerColor = isAvailable ? "#D4AF37" : "#4A4A5A";

        const content = `<div style="
          width:12px;height:12px;border-radius:50%;
          background:${markerColor};
          border:2px solid ${isAvailable ? "#F5E6A3" : "#6B6B7B"};
          box-shadow:0 1px 4px rgba(0,0,0,0.3);
        "></div>`;

        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(r.lat, r.lng),
          content,
          map,
        });

        markersRef.current.push(overlay);
      }
    },
    [availMap]
  );

  // 5. 예약 가능 조회
  const fetchAvailability = useCallback(async () => {
    if (!restaurants.length) return;
    setAvailLoading(true);

    const date = getDateString(selectedDate);
    const params = new URLSearchParams({ date });
    if (selectedPersons) params.set("persons", String(selectedPersons));


    try {
      const res = await fetch(`/api/availability?${params}`);
      const data = await res.json();
      const map = new Map<number, AvailabilityResult>();
      for (const r of data.results || []) {
        map.set(r.restaurantId, r);
      }
      setAvailMap(map);
    } catch (e) {
      console.error("Availability fetch failed", e);
    } finally {
      setAvailLoading(false);
    }
  }, [restaurants, selectedDate, selectedPersons]);

  // 6. 도달시간 계산
  const fetchETA = useCallback(async () => {
    if (!userLocation || !restaurants.length) return;
    setEtaLoading(true);

    const destinations = filteredRestaurants
      .filter((r) => r.lat && r.lng)
      .slice(0, 50)
      .map((r) => ({ id: r.id, lat: r.lat!, lng: r.lng! }));

    if (!destinations.length) {
      setEtaLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: userLocation, destinations }),
      });
      const data = await res.json();
      const map = new Map<number, ETAResult>();
      for (const e of data.eta || []) {
        map.set(e.id, e);
      }
      setEtaMap(map);
    } catch (e) {
      console.error("ETA fetch failed", e);
    } finally {
      setEtaLoading(false);
    }
  }, [userLocation, restaurants]);

  // 7. 날짜/인원/시간대 변경 시 예약 조회
  useEffect(() => {
    if (restaurants.length > 0) {
      fetchAvailability();
    }
  }, [selectedDate, selectedPersons, restaurants.length]);


  // 업종 목록 (데이터 기반 동적)
  const categoryList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of restaurants) {
      counts[r.categoryNorm] = (counts[r.categoryNorm] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ key: name, label: name, emoji: getCategoryEmoji(name), count }));
  }, [restaurants]);

  // 구 → 동 그룹 (DB district 기반, 자동 분류)
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

  const activeFilterCount =
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedDistrict !== "all" || selectedLocation !== "all" ? 1 : 0);

  // 8. 필터링된 리스트
  const filteredRestaurants = restaurants.filter((r) => {
    if (selectedCategory !== "all" && r.categoryNorm !== selectedCategory)
      return false;
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
    return true;
  });

  // 예약 가능 필터: 마감된 식당 제외, 미매칭(전화예약)은 유지
  const availableRestaurants = filteredRestaurants.filter((r) => {
    if (!r.catchtableMatched) return true; // 전화예약만 가능 → 유지
    const avail = availMap.get(r.id);
    if (!avail) return true; // 아직 조회 안 됨 → 유지
    return avail.available; // 예약 가능한 것만
  });

  // 정렬: 예약가능 > 전화예약 > 도달시간순
  const sortedRestaurants = [...availableRestaurants].sort((a, b) => {
    // 예약가능 우선, 전화예약은 뒤로
    const aAvail = a.catchtableMatched && availMap.get(a.id)?.available ? 0 : 1;
    const bAvail = b.catchtableMatched && availMap.get(b.id)?.available ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;

    const etaA = etaMap.get(a.id)?.durationMin ?? 9999;
    const etaB = etaMap.get(b.id)?.durationMin ?? 9999;
    return etaA - etaB;
  });

  // "지금 바로 출발" 모드
  const handleNowMode = useCallback(() => {
    setIsNowMode(true);
    setSelectedDate(null);
    fetchETA();
    fetchAvailability();
  }, [fetchETA, fetchAvailability]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-text-secondary">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden">
      {/* 지도 */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* 상단: 모드 배지만 */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-safe">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-surface/80 backdrop-blur border border-glass-border text-text-secondary">
              {role === "owner" ? "🛠 관리자" : "👤 임원"}
            </span>
          </div>
          {locationError && (
            <span className="text-xs px-2 py-1 rounded-full bg-surface/80 backdrop-blur text-text-muted">
              📍 기본 위치 사용 중
            </span>
          )}
        </div>
      </div>

      {/* 바텀시트 */}
      <motion.div
        className={cn(
          "absolute bottom-[56px] left-0 right-0 z-20",
          "bg-background/95 backdrop-blur-xl",
          "border-t border-glass-border",
          "rounded-t-3xl shadow-2xl"
        )}
        animate={{
          height: sheetExpanded ? "75vh" : "45vh",
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* 핸들 */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => setSheetExpanded(!sheetExpanded)}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* 필터 컨트롤 */}
        <div className="px-4 pb-2 flex flex-col gap-2">
          {/* 날짜 선택 → 인원수 → 지금 바로 출발 순서 */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* 날짜 선택 — native date input (클릭 시 달력 활성화) */}
            <button
              type="button"
              onClick={() => {
                const el = dateInputRef.current;
                if (!el) return;
                // 네이티브 달력 열기 (지원 브라우저는 showPicker, 아니면 focus+click)
                if (typeof el.showPicker === "function") {
                  try { el.showPicker(); return; } catch {}
                }
                el.focus();
                el.click();
              }}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all cursor-pointer",
                !isNowMode && selectedDate
                  ? "bg-gold/20 border border-gold text-gold"
                  : "bg-surface/80 backdrop-blur border border-glass-border text-text-secondary"
              )}
            >
              <CalendarDays className="w-4 h-4" />
              {!isNowMode && selectedDate
                ? formatDateLabel(selectedDate)
                : "날짜 선택"}
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate || ""}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    setIsNowMode(false);
                    setSelectedDate(e.target.value);
                  }
                }}
                className="absolute bottom-0 left-1/2 w-px h-px opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </button>

            {/* 인원수 */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface/80 backdrop-blur border border-glass-border">
              <Users className="w-3.5 h-3.5 text-text-muted" />
              <select
                value={selectedPersons}
                onChange={(e) => setSelectedPersons(Number(e.target.value))}
                className="bg-transparent text-sm text-text-primary outline-none"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n} className="bg-surface text-text-primary" style={{ backgroundColor: "#1a1a1f", color: "#ececec" }}>
                    {n}명
                  </option>
                ))}
              </select>
            </div>

            {/* 지금 바로 출발 */}
            <button
              onClick={handleNowMode}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap",
                "transition-all duration-200",
                isNowMode
                  ? "bg-gold text-background shadow-lg shadow-gold/20"
                  : "bg-surface/80 backdrop-blur border border-glass-border text-text-primary"
              )}
            >
              <Zap className="w-4 h-4" />
              지금 바로 출발
            </button>
          </div>

          {/* 검색 + 필터 토글 */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface/80 backdrop-blur border border-glass-border flex-1 min-w-[100px]">
              <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색"
                className="bg-transparent text-sm text-text-primary outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-3.5 h-3.5 text-text-muted" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all",
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

          {/* 선택된 필터 태그 (접혀있을 때) */}
          {!showFilters && activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {selectedCategory !== "all" && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold">
                  {getCategoryEmoji(selectedCategory)} {selectedCategory}
                  <button onClick={() => setSelectedCategory("all")} className="ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(selectedDistrict !== "all" || selectedLocation !== "all") && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20 text-xs text-gold">
                  {selectedLocation !== "all" ? selectedLocation : selectedDistrict}
                  <button onClick={() => { setSelectedDistrict("all"); setSelectedLocation("all"); }} className="ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => { setSelectedCategory("all"); setSelectedDistrict("all"); setSelectedLocation("all"); }}
                className="px-2.5 py-1 rounded-full text-xs text-text-muted border border-border"
              >
                초기화
              </button>
            </div>
          )}

          {/* 업종 + 지역 (펼침) */}
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

                {/* 지역 — 2단: 동 (구 선택 시) */}
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

        {/* 로딩 인디케이터 */}
        {(etaLoading || availLoading) && (
          <div className="mx-4 mb-2">
            <div className="h-0.5 bg-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gold"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                style={{ width: "40%" }}
              />
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">
              {isNowMode ? "지금 바로 갈 수 있는 곳" : "예약 가능한 식당"}
            </h2>
            <span className="text-xs text-text-muted">
              {sortedRestaurants.length}곳
            </span>
          </div>
          <button
            onClick={() => setSheetExpanded(!sheetExpanded)}
            className="p-2 rounded-full bg-surface"
          >
            <ChevronUp
              className={cn(
                "w-4 h-4 text-text-secondary transition-transform",
                sheetExpanded && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* 리스트 */}
        <div className="overflow-y-auto px-4 pb-safe" style={{ height: "calc(100% - 240px)" }}>
          <div className="flex flex-col gap-3">
            {sortedRestaurants.map((r) => {
              const eta = etaMap.get(r.id);
              const avail = availMap.get(r.id);

              return (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  eta={eta}
                  availability={avail}
                />
              );
            })}

            {sortedRestaurants.length === 0 && (
              <div className="py-12 text-center text-text-muted">
                조건에 맞는 식당이 없습니다
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function RestaurantCard({
  restaurant,
  eta,
  availability,
}: {
  restaurant: Restaurant;
  eta?: ETAResult;
  availability?: AvailabilityResult;
}) {
  const emoji = getCategoryEmoji(restaurant.categoryNorm);
  const isAvailable = availability?.available;

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
      {/* 도달시간 or 매장 이미지 */}
      <div className="flex flex-col items-center justify-center min-w-[56px]">
        {eta ? (
          <>
            <span className="text-2xl font-bold text-gold-light">
              {eta.durationMin}
            </span>
            <span className="text-[10px] text-text-muted">분</span>
          </>
        ) : (
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface border border-border/30">
            {restaurant.imageUrl ? (
              <img src={restaurant.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">{emoji}</div>
            )}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary truncate">
            {restaurant.nameKor}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-text-muted">
            {emoji} {restaurant.categoryNorm}
          </span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">
            {restaurant.locationNorm}
          </span>
          {eta && (
            <>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">
                {eta.distanceKm}km
              </span>
            </>
          )}
        </div>
      </div>

      {/* 예약 상태 */}
      <div className="flex flex-col items-end gap-1">
        {restaurant.catchtableMatched ? (
          isAvailable ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">
                예약 가능
              </span>
              {availability?.availableTimes && availability.availableTimes.length > 0 && (
                <span className="text-[10px] text-gold/70">
                  {availability.availableTimes.slice(0, 3).join(" · ")}
                  {availability.availableTimes.length > 3 && ` +${availability.availableTimes.length - 3}`}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-surface-alt text-text-muted">
              마감
            </span>
          )
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-surface-alt text-text-muted border border-border/50">
            <Phone className="w-3 h-3" />
            전화예약
          </span>
        )}
      </div>
    </motion.a>
  );
}
