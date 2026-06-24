"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { CATEGORIES, type CategoryKey } from "@/lib/constants";

interface CategoryTabsProps {
  selected: CategoryKey;
  onSelect: (key: CategoryKey) => void;
}

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1 -mx-1">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={cn(
              "relative flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium",
              "transition-colors duration-200",
              isActive
                ? "text-background"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gold rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
