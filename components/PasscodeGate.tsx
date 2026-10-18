"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PasscodeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("reviewer_unlocked");

    if (saved === "true") {
      setUnlocked(true);
    }

    setChecking(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const { data, error } = await supabase
      .from("app_settings")
      .select("passcode")
      .limit(1)
      .single();

    if (error || !data) {
      setError("Unable to verify passcode.");
      return;
    }

    if (passcode === data.passcode) {
      localStorage.setItem("reviewer_unlocked", "true");
      setUnlocked(true);
      setPasscode("");
    } else {
      setError("Wrong passcode.");
      setPasscode("");
    }
  }

  function logout() {
    localStorage.removeItem("reviewer_unlocked");
    setUnlocked(false);
    setPasscode("");
    setError("");
  }

  if (checking) {
    return null;
  }

  if (unlocked) {
    return (
      <div className="min-h-screen">
        {/* Logout button */}
        <div className="fixed right-4 top-4 z-40">
          <button
            onClick={logout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            Lock App
          </button>
        </div>

        {children}
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-7">
        <div className="mb-6 text-center">
          <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <span className="text-xl">🔐</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Reviewer
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Enter the passcode to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg tracking-[0.3em] text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            autoFocus
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Unlock
          </button>
        </form>
      </div>
    </main>
  );
}