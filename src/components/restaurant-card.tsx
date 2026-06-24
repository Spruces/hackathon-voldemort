"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { getCategoryEmoji } from "@/lib/constants";
import type { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
  index: number;
  onClick: () => void;
}

export function RestaurantCard({
  restaurant,
  index,
  onClick,
}: RestaurantCardProps) {
  const emoji = getCategoryEmoji(restaurant.categoryNorm);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-2xl cursor-pointer",
        "bg-surface/60 backdrop-blur-md",
        "border border-glass-border",
        "hover:border-gold/30 hover:bg-surface-alt/60",
        "transition-all duration-200",
        "group"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Emoji icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-surface-alt border border-border/50",
            "group-hover:border-gold/20 transition-colors"
          )}
        >
          <span className="text-2xl">{emoji}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary truncate">
            {restaurant.nameKor}
          </h3>
          {restaurant.nameEng && (
            <p className="text-xs text-text-muted truncate mt-0.5">
              {restaurant.nameEng}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gold-dim font-medium">
              {restaurant.categoryNorm}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-0.5 text-xs text-text-secondary">
              <MapPin className="w-3 h-3" />
              {restaurant.locationNorm}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
