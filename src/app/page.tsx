"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Delete } from "lucide-react";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  // 이미 세션 있으면 자동 이동
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          window.location.href = "/list";
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: code }),
      });

      if (res.ok) {
        window.location.href = "/list";
      } else {
        setError(true);
        setDigits("");
      }
    } catch {
      setError(true);
      setDigits("");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDigit = useCallback(
    (d: string) => {
      if (digits.length >= 6) return;
      setError(false);
      const next = digits + d;
      setDigits(next);

      if (next.length === 6) {
        handleSubmit(next);
      }
    },
    [digits, handleSubmit]
  );

  const handleDelete = useCallback(() => {
    setError(false);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-dvh px-6 py-12">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
        {/* Logo area */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface border border-glass-border flex items-center justify-center">
            <Lock className="w-7 h-7 text-gold" />
          </div>
          <div className="text-center">
            <p className="text-xs text-gold/70 mb-1 tracking-widest">VIP RESTAURANTS</p>
            <h1 className="text-2xl font-bold tracking-tight text-gold">
              추천 식당
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              비밀번호를 입력해 주세요
            </p>
          </div>
        </motion.div>

        {/* Dots */}
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i < digits.length ? 1.2 : 1,
                backgroundColor:
                  error
                    ? "var(--color-danger)"
                    : i < digits.length
                    ? "var(--color-gold)"
                    : "var(--color-border)",
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-3.5 h-3.5 rounded-full"
            />
          ))}
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-danger"
            >
              비밀번호가 일치하지 않습니다
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Keypad */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full max-w-xs"
      >
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
            (key) => {
              if (key === "") return <div key="empty" />;
              if (key === "del") {
                return (
                  <KeypadButton
                    key={key}
                    onPress={handleDelete}
                    disabled={loading}
                  >
                    <Delete className="w-5 h-5" />
                  </KeypadButton>
                );
              }
              return (
                <KeypadButton
                  key={key}
                  onPress={() => handleDigit(key)}
                  disabled={loading}
                >
                  {key}
                </KeypadButton>
              );
            }
          )}
        </div>
      </motion.div>
    </div>
  );
}

function KeypadButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onPress}
      disabled={disabled}
      className={cn(
        "h-16 rounded-2xl flex items-center justify-center",
        "text-xl font-medium text-text-primary",
        "bg-surface/50 backdrop-blur-sm",
        "border border-border/50",
        "transition-colors duration-150",
        "active:bg-surface-alt active:border-gold/30",
        "disabled:opacity-50"
      )}
    >
      {children}
    </motion.button>
  );
}
