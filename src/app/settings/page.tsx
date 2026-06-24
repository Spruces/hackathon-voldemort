"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Key, LogOut, Shield, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";

export default function SettingsPage() {
  const router = useRouter();
  const [viewerPw, setViewerPw] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // 리스트 추가
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    nameKor: "",
    nameEng: "",
    location: "",
    category: "",
    tel: "",
    address: "",
    memo: "",
  });
  const [addMessage, setAddMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const handleAddRestaurant = async () => {
    setAddMessage(null);
    if (!addForm.nameKor || !addForm.location || !addForm.category || !addForm.address) {
      setAddMessage({ type: "error", text: "식당명·위치·종류·주소는 필수입니다." });
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        setAddMessage({ type: "ok", text: `"${addForm.nameKor}" 추가되었습니다.` });
        setAddForm({ nameKor: "", nameEng: "", location: "", category: "", tel: "", address: "", memo: "" });
      } else {
        setAddMessage({ type: "error", text: data.error || "추가에 실패했습니다." });
      }
    } catch {
      setAddMessage({ type: "error", text: "추가에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setAddLoading(false);
    }
  };

  const [role, setRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) {
        router.push("/");
        return null;
      }
      return r.json();
    }).then((data) => {
      // 로그인 안 됨 → 홈. 로그인됐으면 누구나 설정 진입 가능(로그아웃용).
      if (data && !data.authenticated) {
        router.push("/");
        return;
      }
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
    if (!confirm("모든 세션을 만료시키겠습니까? 모든 사용자가 재로그인해야 합니다.")) return;

    await fetch("/api/settings", { method: "DELETE" });
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  return (
    <div className="min-h-dvh">
      {/* Header */}
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
        {/* 사장님 전용 관리 기능 (비번 변경 + 리스트 추가) */}
        {role === "owner" && (
        <>
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
              <label className="text-xs text-text-secondary">
                임원용 비밀번호 (6자리 숫자)
              </label>
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
              <label className="text-xs text-text-secondary">
                사장님 비밀번호 (6자리 숫자)
              </label>
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
            <p
              className={cn(
                "text-sm",
                message.type === "ok" ? "text-green-400" : "text-danger"
              )}
            >
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

        {/* 리스트 추가 */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-gold" />
            <h2 className="text-base font-semibold">리스트 추가</h2>
          </div>

          {!showAddForm ? (
            <button
              onClick={() => { setShowAddForm(true); setAddMessage(null); }}
              className="w-full h-12 rounded-xl bg-gold/10 border border-gold/30 text-gold font-medium text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              리스트 추가
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted">엑셀 형식 그대로 입력 (식당명·위치·종류·주소 필수)</p>
                  <button onClick={() => setShowAddForm(false)} className="text-text-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {[
                  { key: "nameKor", label: "식당명 (한글) *", ph: "예: 라연" },
                  { key: "nameEng", label: "식당명 (영문)", ph: "예: Layeon (없으면 비워두세요)" },
                  { key: "location", label: "위치 *", ph: "예: 장충동" },
                  { key: "category", label: "종류 *", ph: "예: Korean, 한식, Sushi, Italian…" },
                  { key: "tel", label: "전화번호", ph: "예: 02-2230-2323" },
                  { key: "address", label: "주소 *", ph: "예: 서울 중구 동호로 249" },
                  { key: "memo", label: "메모 (사장님 전용)", ph: "임원에게 보이지 않는 메모" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-text-secondary">{f.label}</label>
                    <input
                      type="text"
                      value={addForm[f.key as keyof typeof addForm]}
                      onChange={(e) => setAddForm({ ...addForm, [f.key]: e.target.value })}
                      placeholder={f.ph}
                      className="w-full h-11 px-4 rounded-xl bg-surface border border-border/60 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40"
                    />
                  </div>
                ))}

                {addMessage && (
                  <p className={cn("text-sm", addMessage.type === "ok" ? "text-green-400" : "text-danger")}>
                    {addMessage.text}
                  </p>
                )}

                <button
                  onClick={handleAddRestaurant}
                  disabled={addLoading}
                  className="w-full h-12 rounded-xl bg-gold text-background font-medium text-sm disabled:opacity-50"
                >
                  {addLoading ? "추가 중…" : "저장"}
                </button>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  💡 종류는 입력값을 자동으로 7개 업종(한식·일식·이탈리안·중식·프렌치·아메리칸·양식·아시안·기타)으로 분류합니다. 메모는 🔒 사장님만 볼 수 있습니다.
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.section>
        </>
        )}

        {/* Session management */}
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
