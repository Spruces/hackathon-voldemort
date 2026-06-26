"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Megaphone, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORIES } from "@/lib/constants";
import type { Restaurant } from "@/lib/types";

export default function EditRestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [publicDesc, setPublicDesc] = useState("");
  const [hours, setHours] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  const [parking, setParking] = useState("");
  const [categoryNorm, setCategoryNorm] = useState("");

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
          if (data.role !== "owner") {
            router.push(`/restaurants/${params.id}`);
            return;
          }
          setRestaurant(data);
          setPublicDesc(data.publicDesc || "");
          setHours(data.hours || "");
          setInternalMemo(data.internalMemo || "");
          setParking(data.parking || "");
          setCategoryNorm(data.categoryNorm || "");
        }
        setLoading(false);
      });
  }, [params.id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicDesc: publicDesc || null,
          hours: hours || null,
          internalMemo: internalMemo || null,
          parking: parking || null,
          categoryNorm,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) return null;

  return (
    <div className="min-h-dvh pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-surface border border-border/50 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold">{restaurant.nameKor}</h1>
              <p className="text-xs text-text-muted">편집</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg",
              "bg-gold text-background font-medium text-sm",
              "disabled:opacity-50 transition-opacity"
            )}
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </header>

      {/* Toast */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gold text-background text-sm font-medium shadow-lg"
        >
          저장되었습니다.
        </motion.div>
      )}

      <div className="px-5 py-6 space-y-6">
        {/* 카테고리 — FR-11 */}
        <FieldGroup
          label="업종 카테고리"
          badge="public"
        >
          <select
            value={categoryNorm}
            onChange={(e) => setCategoryNorm(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border/60 text-text-primary text-sm focus:outline-none focus:border-gold/40"
          >
            {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </select>
        </FieldGroup>

        {/* 식당 소개 — FR-10 📢 */}
        <FieldGroup label="식당 소개" badge="public">
          <textarea
            value={publicDesc}
            onChange={(e) => setPublicDesc(e.target.value)}
            placeholder="임원에게 보여지는 식당 소개를 입력하세요"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border/60 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
          />
        </FieldGroup>

        {/* 영업시간 — FR-10 📢 */}
        <FieldGroup label="영업시간" badge="public">
          <input
            type="text"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="예: 11:30-22:00, 월요일 휴무"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border/60 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
          />
        </FieldGroup>

        {/* 주차 — FR-10 📢 */}
        <FieldGroup label="주차" badge="public">
          <input
            type="text"
            value={parking}
            onChange={(e) => setParking(e.target.value)}
            placeholder="예: 발렛 가능, 건물 지하 주차"
            className="w-full h-12 px-4 rounded-xl bg-surface border border-border/60 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
          />
        </FieldGroup>

        {/* 자유 메모 — FR-10 🔒 */}
        <FieldGroup label="자유 메모" badge="private">
          <textarea
            value={internalMemo}
            onChange={(e) => setInternalMemo(e.target.value)}
            placeholder="나만 볼 수 있는 메모입니다."
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-gold/20 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 resize-none"
          />
        </FieldGroup>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  badge,
  children,
}: {
  label: string;
  badge: "public" | "private";
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        {badge === "private" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-medium border border-gold/20">
            <Lock className="w-2.5 h-2.5" />
            나만 보기
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary text-[10px] font-medium border border-border/50">
            <Megaphone className="w-2.5 h-2.5" />
            임원에게 보임
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
