"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
      <input
        type="text"
        placeholder="식당명 · 지역 · 업종 검색"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-12 pl-11 pr-10 rounded-xl",
          "bg-surface/60 backdrop-blur-sm",
          "border border-border/60",
          "text-sm text-text-primary placeholder:text-text-muted",
          "focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20",
          "transition-all duration-200"
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface-alt"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  );
}
