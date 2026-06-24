"use client";

import { useState, useEffect, useRef, use } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Navigation,
  Share2,
  Clock,
  Car,
  MapPin,
  Calendar,
  ExternalLink,
  Star,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getCategoryEmoji } from "@/lib/constants";

interface RestaurantDetail {
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
  publicDesc: string | null;
  hours: string | null;
  parking: string | null;
  catchtableAlias: string | null;
  catchtableMatched: boolean;
  internalMemo?: string | null;
  catchtableCache?: {
    bizHours: string | null;
    parkingGuide: string | null;
    priceLunch: string | null;
    priceDinner: string | null;
    rating: string | null;
    imageUrl: string | null;
    serviceDesc: string | null;
    onlineYn: string | null;
  } | null;
}

interface DaySlot {
  date: string;
  availableStatus: string;
  availablePersons: string | null;
}

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [role, setRole] = useState<string>("");
  const [daySlots, setDaySlots] = useState<DaySlot[]>([]);
  const [eta, setEta] = useState<{ durationMin: number; distanceKm: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setRestaurant(data.restaurant);
        setRole(data.role);
        setDaySlots(data.daySlots || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // ETA 계산
  useEffect(() => {
    if (!restaurant?.lat || !restaurant?.lng) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/directions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              destinations: [
                { id: restaurant.id, lat: restaurant.lat, lng: restaurant.lng },
              ],
            }),
          });
          const data = await res.json();
          if (data.eta?.[0]) {
            setEta(data.eta[0]);
          }
        } catch {}
      },
      () => {}
    );
  }, [restaurant]);

  // 지도 초기화
  useEffect(() => {
    if (!restaurant?.lat || !restaurant?.lng || !mapRef.current) return;

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY}&autoload=false`;
    script.onload = () => {
      (window as any).kakao.maps.load(() => {
        const kakao = (window as any).kakao;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(restaurant.lat, restaurant.lng),
          level: 4,
        });
        new kakao.maps.Marker({
          position: new kakao.maps.LatLng(restaurant.lat, restaurant.lng),
          map,
        });
      });
    };
    document.head.appendChild(script);
  }, [restaurant]);

  if (loading || !restaurant) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-text-secondary">불러오는 중…</div>
      </div>
    );
  }

  const cache = restaurant.catchtableCache;
  const emoji = getCategoryEmoji(restaurant.categoryNorm);
  const availableSlots = daySlots.filter((s) => s.availableStatus === "AVAILABLE");

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* 헤더 이미지 */}
      <div className="relative h-56 bg-surface">
        {cache?.imageUrl ? (
          <img
            src={cache.imageUrl}
            alt={restaurant.nameKor}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {emoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

        {/* 뒤로가기 */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-background/60 backdrop-blur"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>
      </div>

      {/* 기본 정보 */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-surface rounded-2xl p-5 border border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                {restaurant.nameKor}
              </h1>
              {restaurant.nameEng && (
                <p className="text-sm text-text-muted mt-0.5">
                  {restaurant.nameEng}
                </p>
              )}
            </div>
            {cache?.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-gold fill-gold" />
                <span className="text-sm font-medium text-gold">
                  {cache.rating}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
            <span>{emoji} {restaurant.categoryNorm}</span>
            <span>·</span>
            <span>{restaurant.locationNorm}</span>
          </div>

          {/* 가격대 */}
          {(cache?.priceLunch || cache?.priceDinner) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-text-secondary">
              {cache.priceLunch && <span>🍽 {cache.priceLunch}</span>}
              {cache.priceDinner && <span>🌙 {cache.priceDinner}</span>}
            </div>
          )}
        </div>
      </div>

      {/* 도달시간 */}
      {eta && (
        <div className="px-4 mt-4">
          <div className="bg-surface rounded-2xl p-4 border border-gold/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-gold" />
                <div>
                  <span className="text-2xl font-bold text-gold-light">
                    {eta.durationMin}분
                  </span>
                  <span className="text-sm text-text-muted ml-2">
                    ({eta.distanceKm}km)
                  </span>
                </div>
              </div>
              <span className="text-xs text-text-muted">현재 위치 기준</span>
            </div>
          </div>
        </div>
      )}

      {/* 예약 가능 날짜 */}
      {restaurant.catchtableMatched && (
        <div className="px-4 mt-4">
          <div className="bg-surface rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-text-primary">
                예약 가능 날짜
              </span>
            </div>

            {availableSlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => {
                  const persons = slot.availablePersons
                    ? JSON.parse(slot.availablePersons)
                    : [];
                  const dateStr = slot.date.slice(5); // MM-DD
                  return (
                    <div
                      key={slot.date}
                      className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20"
                    >
                      <span className="text-sm text-gold">{dateStr}</span>
                      {persons.length > 0 && (
                        <span className="text-xs text-text-muted ml-1">
                          {persons.join(",")}명
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                현재 예약 가능한 날짜가 없습니다
              </p>
            )}

            {restaurant.catchtableAlias && (
              <a
                href={`https://app.catchtable.co.kr/ct/shop/${restaurant.catchtableAlias}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-4 py-3 rounded-xl bg-gold text-background font-medium text-sm"
              >
                캐치테이블에서 예약
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* 지도 */}
      {restaurant.lat && restaurant.lng && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl overflow-hidden border border-border/50">
            <div ref={mapRef} className="h-48 w-full" />
          </div>
        </div>
      )}

      {/* 상세 정보 */}
      <div className="px-4 mt-4 space-y-3">
        {/* 영업시간 */}
        {(cache?.bizHours || restaurant.hours) && (
          <InfoRow
            icon={<Clock className="w-4 h-4" />}
            label="영업시간"
            value={cache?.bizHours || restaurant.hours!}
          />
        )}

        {/* 주차 */}
        {(cache?.parkingGuide || restaurant.parking) && (
          <InfoRow
            icon={<Car className="w-4 h-4" />}
            label="주차"
            value={cache?.parkingGuide || restaurant.parking!}
          />
        )}

        {/* 주소 */}
        <InfoRow
          icon={<MapPin className="w-4 h-4" />}
          label="주소"
          value={restaurant.address}
        />

        {/* 소개 */}
        {(cache?.serviceDesc || restaurant.publicDesc) && (
          <div className="bg-surface rounded-2xl p-4 border border-border/50">
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {cache?.serviceDesc || restaurant.publicDesc}
            </p>
          </div>
        )}

        {/* Owner 전용: 비공개 메모 */}
        {role === "owner" && restaurant.internalMemo && (
          <div className="bg-surface rounded-2xl p-4 border border-gold/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold">
                🔒 나만 보기
              </span>
            </div>
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {restaurant.internalMemo}
            </p>
          </div>
        )}
      </div>

      {/* 하단 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border/50 px-4 py-3 pb-safe">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {restaurant.catchtableAlias && (
            <a
              href={`https://app.catchtable.co.kr/ct/shop/${restaurant.catchtableAlias}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gold text-background font-medium text-sm"
            >
              예약
            </a>
          )}
          <a
            href={`https://map.kakao.com/link/to/${restaurant.nameKor},${restaurant.lat},${restaurant.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-text-primary"
          >
            <Navigation className="w-4 h-4" />
            길찾기
          </a>
          {restaurant.tel && (
            <a
              href={`tel:${restaurant.tel}`}
              className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-text-primary"
            >
              <Phone className="w-4 h-4" />
              전화
            </a>
          )}
          <button
            onClick={() => {
              navigator.share?.({
                title: restaurant.nameKor,
                url: window.location.href,
              });
            }}
            className="flex items-center justify-center p-3 rounded-xl bg-surface border border-border/50"
          >
            <Share2 className="w-4 h-4 text-text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-surface rounded-2xl p-4 border border-border/50">
      <div className="text-text-muted mt-0.5">{icon}</div>
      <div>
        <span className="text-xs text-text-muted">{label}</span>
        <p className="text-sm text-text-primary whitespace-pre-line">{value}</p>
      </div>
    </div>
  );
}
