"use client";

import { cn } from "@/lib/cn";
import { User, Wrench, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/types";

interface ModeBadgeProps {
  role: UserRole;
  previewMode?: boolean;
  onTogglePreview?: () => void;
}

export function ModeBadge({ role, previewMode, onTogglePreview }: ModeBadgeProps) {
  const router = useRouter();
  const isOwner = role === "owner";
  const displayAsViewer = previewMode;

  return (
    <div className="flex items-center gap-2">
      {/* FR-08a: 임원 미리보기 토글 — owner만 */}
      {isOwner && onTogglePreview && (
        <button
          onClick={onTogglePreview}
          className={cn(
            "px-2.5 py-1.5 rounded-full text-[10px] font-medium border transition-colors",
            previewMode
              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
              : "bg-surface-alt text-text-muted border-border/50 hover:text-text-secondary"
          )}
        >
          {previewMode ? "👤 미리보기 중" : "👤 임원 시점"}
        </button>
      )}

      {/* Mode badge */}
      <button
        onClick={() => isOwner && router.push("/settings")}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
          isOwner && !displayAsViewer
            ? "bg-gold/10 text-gold border border-gold/20"
            : "bg-surface-alt text-text-secondary border border-border/50"
        )}
      >
        {isOwner && !displayAsViewer ? (
          <>
            <Wrench className="w-3 h-3" />
            관리자
            <Settings className="w-3 h-3 ml-0.5 opacity-50" />
          </>
        ) : (
          <>
            <User className="w-3 h-3" />
            임원
          </>
        )}
      </button>
    </div>
  );
}
