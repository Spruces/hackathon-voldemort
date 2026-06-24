"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Car,
  Navigation,
  Share2,
  CalendarCheck,
  Lock,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getCategoryEmoji } from "@/lib/constants";
import { MapView } from "@/components/map-view";
import type { Restaurant, UserRole } from "@/lib/types";

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [role, setRole] = useState<UserRole>("viewer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/restaurants/${params.id}`)
      .then((r) => {
        if (!r.ok) {
          router.push("/");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setRestaurant(data);
          setRole(data.role);
        }
        setLoading(false);
      });
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <p className="text-text-secondary">식당을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const emoji = getCategoryEmoji(restaurant.categoryNorm);

  const actions = [
    {
      icon: Navigation,
      label: "길찾기",
      href: `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.nameKor + " " + restaurant.address)}`,
    },
    {
      icon: Phone,
      label: "전화",
      href: restaurant.tel ? `tel:${restaurant.tel}` : undefined,
    },
    {
      icon: CalendarCheck,
      label: "예약",
      href: undefined,
    },
    {
      icon: Share2,
      label: "공유",
      onClick: () => {
        if (navigator.share) {
          navigator.share({
            title: restaurant.nameKor,
            text: `${restaurant.nameKor} - ${restaurant.address}`,
            url: window.location.href,
          });
        } else {
          navigator.clipboard.writeText(window.location.href);
        }
      },
    },
  ];

  return (
    <div className="min-h-dvh pb-8">
      {/* Hero */}
      <div className="relative h-56 bg-gradient-to-b from-surface-alt to-background flex items-center justify-center">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-7xl"
        >
          {emoji}
        </motion.span>

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-4 w-10 h-10 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-text-primary" />
        </button>

        {/* Edit button — owner only */}
        {role === "owner" && (
          <button
            onClick={() => router.push(`/restaurants/${restaurant.id}/edit`)}
            className="absolute top-5 right-4 w-10 h-10 rounded-full bg-gold/10 backdrop-blur-sm border border-gold/30 flex items-center justify-center"
          >
            <Pencil className="w-4 h-4 text-gold" />
          </button>
        )}

        {/* Category badge */}
        <div className="absolute bottom-4 left-5">
          <span className="px-3 py-1 rounded-full bg-gold/15 text-gold text-xs font-medium border border-gold/20">
            {restaurant.categoryNorm}
            {restaurant.categoryRaw && restaurant.categoryRaw !== restaurant.categoryNorm && (
              <span className="text-gold-dim ml-1">· {restaurant.categoryRaw}</span>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-2">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold">{restaurant.nameKor}</h1>
          {restaurant.nameEng && (
            <p className="text-sm text-text-muted mt-0.5">
              {restaurant.nameEng}
            </p>
          )}
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mt-5"
        >
          {actions.map((action) => {
            const Tag = action.href ? "a" : "button";
            return (
              <Tag
                key={action.label}
                href={action.href || undefined}
                onClick={"onClick" in action ? action.onClick : undefined}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl",
                  "bg-surface/60 border border-border/40",
                  "hover:border-gold/30 transition-colors",
                  !action.href && !("onClick" in action) && "opacity-40 pointer-events-none"
                )}
              >
                <action.icon className="w-5 h-5 text-gold" />
                <span className="text-xs text-text-secondary">
                  {action.label}
                </span>
              </Tag>
            );
          })}
        </motion.div>

        {/* Info sections */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 space-y-4"
        >
          <InfoRow icon={MapPin} label="주소" value={restaurant.address} />
          <InfoRow
            icon={Phone}
            label="전화"
            value={restaurant.tel || "전화번호 정보 없음"}
          />
          <InfoRow
            icon={Clock}
            label="영업시간"
            value={restaurant.hours || "영업시간 정보 없음"}
          />
          <InfoRow
            icon={Car}
            label="주차"
            value={restaurant.parking || "주차 정보 없음"}
          />
        </motion.div>

        {/* Description */}
        {restaurant.publicDesc && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-4 rounded-xl bg-surface/40 border border-border/30"
          >
            <h3 className="text-sm font-medium text-text-secondary mb-2">
              식당 소개
            </h3>
            <p className="text-sm text-text-primary leading-relaxed">
              {restaurant.publicDesc}
            </p>
          </motion.div>
        )}

        {/* Map — FR-09a */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-6"
        >
          <MapView
            name={restaurant.nameKor}
            address={restaurant.address}
            lat={restaurant.lat}
            lng={restaurant.lng}
          />
        </motion.div>

        {/* Owner-only: Internal memo — FR-10a 🔒 나만 보기 */}
        {role === "owner" && restaurant.internalMemo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 rounded-xl bg-gold/5 border border-gold/15"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Lock className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs font-medium text-gold">나만 보기</span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed">
              {restaurant.internalMemo}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const isEmpty = value.includes("정보 없음");
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4.5 h-4.5 text-text-muted mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p
          className={cn(
            "text-sm mt-0.5",
            isEmpty ? "text-text-muted italic" : "text-text-primary"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
