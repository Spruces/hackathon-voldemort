"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

interface MapViewProps {
  name: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}

declare global {
  interface Window {
    kakao?: any;
  }
}

export function MapView({ name, address, lat, lng }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(name + " " + address)}`;

  useEffect(() => {
    if (!kakaoKey) return;

    const loadSDK = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => setSdkReady(true));
        return;
      }

      const script = document.createElement("script");
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`;
      script.onload = () => {
        window.kakao.maps.load(() => setSdkReady(true));
      };
      document.head.appendChild(script);
    };

    loadSDK();
  }, [kakaoKey]);

  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;

    const { kakao } = window;

    // 좌표가 있으면 바로 표시
    if (lat && lng) {
      const position = new kakao.maps.LatLng(lat, lng);
      const map = new kakao.maps.Map(mapRef.current, {
        center: position,
        level: 3,
      });
      new kakao.maps.Marker({ map, position });
      setMapLoaded(true);
      return;
    }

    // 좌표 없으면 주소로 검색
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result: any[], status: string) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        const position = new kakao.maps.LatLng(result[0].y, result[0].x);
        const map = new kakao.maps.Map(mapRef.current!, {
          center: position,
          level: 3,
        });
        new kakao.maps.Marker({ map, position });
        setMapLoaded(true);
      } else {
        // 주소 검색 실패 시 키워드로 재시도
        const places = new kakao.maps.services.Places();
        places.keywordSearch(name, (result: any[], status: string) => {
          if (status === kakao.maps.services.Status.OK && result.length > 0) {
            const position = new kakao.maps.LatLng(result[0].y, result[0].x);
            const map = new kakao.maps.Map(mapRef.current!, {
              center: position,
              level: 3,
            });
            new kakao.maps.Marker({ map, position });
            setMapLoaded(true);
          }
        });
      }
    });
  }, [sdkReady, lat, lng, address, name]);

  // API 키 없으면 외부 링크
  if (!kakaoKey) {
    return (
      <a
        href={kakaoMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center justify-center gap-2 h-40 rounded-xl",
          "bg-surface-alt border border-border/40",
          "hover:border-gold/30 transition-colors"
        )}
      >
        <MapPin className="w-5 h-5 text-gold" />
        <span className="text-sm text-text-secondary">카카오맵에서 위치 보기</span>
        <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
      </a>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-48 rounded-xl overflow-hidden border border-border/30"
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-alt rounded-xl border border-border/30">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-text-muted">지도 로딩 중...</span>
          </div>
        </div>
      )}
      <a
        href={kakaoMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-xs text-text-secondary hover:text-gold flex items-center gap-1"
      >
        <ExternalLink className="w-3 h-3" />
        크게 보기
      </a>
    </div>
  );
}
