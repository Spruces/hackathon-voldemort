"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, List, Settings, PlusCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setRole(data.role || null))
      .catch(() => {});
  }, []);

  const tabs = [
    { href: "/list", label: "리스트", icon: List },
    { href: "/map", label: "지도", icon: Map },
    ...(role === "owner"
      ? [{ href: "/add", label: "추가", icon: PlusCircle }]
      : []),
    { href: "/settings", label: "설정", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe">
      <div className="max-w-lg mx-auto flex items-center">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
                active ? "text-gold" : "text-text-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
