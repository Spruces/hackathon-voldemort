"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Key, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const router = useRouter();
  const [viewerPw, setViewerPw] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/"); return null; }
      return r.json();
    }).then((data) => {
      if (data && !data.authenticated) { router.push("/"); return; }
      if (data) setRole(data.role);
    });
  }, [router]);

  const handleChangePassword = async () => {
    if (!viewerPw && !ownerPw) {
      setMessage({ type: "error", text: "변경할 비밀번호를 입력해 주세요" });
      return;
    }
    setLoading(true);
    setMessage(null);

    const body: Record<string, string> = {};
    if (viewerPw) body.viewerPassword = viewerPw;
    if (ownerPw) body.ownerPassword = ownerPw;

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "ok", text: "비밀번호가 변경되었습니다" });
      setViewerPw("");
      setOwnerPw("");
    } else {
      setMessage({ type: "error", text: data.error });
    }
    setLoading(false);
  };

  const handleLogoutAll = async () => {
    if (!confirm("모든 세션을 만료시키겠습니까?")) return;
    await fetch("/api/settings", { method: "DELETE" });
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-5 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/list")}
            className="w-9 h-9 rounded-full bg-surface border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">설정</h1>
        </div>
      </header>

      <div className="px-5 py-6 space-y-8">
        {role === "owner" && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gold" />
              <h2 className="text-base font-semibold">비밀번호 변경</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary">임원용 비밀번호 (6자리 숫자)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={viewerPw}
                  onChange={(e) => setViewerPw(e.target.value.replace(/\D/g, ""))}
                  placeholder="변경할 비밀번호 입력"
                  className="w-full h-12 px-4 rounded-xl bg-surface border border-border/60 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary">사장님 비밀번호 (6자리 숫자)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={ownerPw}
                  onChange={(e) => setOwnerPw(e.target.value.replace(/\D/g, ""))}
                  placeholder="변경할 비밀번호 입력"
                  className="w-full h-12 px-4 rounded-xl bg-surface border border-border/60 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                />
              </div>
            </div>

            {message && (
              <p className={cn("text-sm", message.type === "ok" ? "text-green-400" : "text-danger")}>
                {message.text}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gold text-background font-medium text-sm disabled:opacity-50"
            >
              비밀번호 변경
            </button>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold" />
            <h2 className="text-base font-semibold">세션 관리</h2>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full h-12 rounded-xl bg-gold text-background font-medium text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>

            {role === "owner" && (
              <button
                onClick={handleLogoutAll}
                className="w-full h-12 rounded-xl bg-danger/10 border border-danger/30 text-danger font-medium text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                전체 로그아웃 (모든 기기)
              </button>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
