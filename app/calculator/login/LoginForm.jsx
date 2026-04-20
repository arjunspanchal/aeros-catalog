"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputCls } from "@/app/calculator/_components/ui";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/calculator";
  const [mode, setMode] = useState("client");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState("enter");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function requestOtp(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/calc/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    setStage("otp");
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/calc/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    router.push(next === "/calculator" ? "/calculator/client" : next);
  }

  async function adminLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/calc/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    router.push(next === "/calculator" ? "/calculator/admin" : next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6">
        <a href="/" className="inline-block text-xs text-gray-500 hover:text-blue-700 mb-3">← Back to Aeros home</a>
        <h1 className="text-xl font-bold text-gray-900">Aeros Paper Bag Rate Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>

        <div className="mt-5 flex gap-2 mb-5">
          <button
            onClick={() => { setMode("client"); setErr(""); setStage("enter"); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "client" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >Client</button>
          <button
            onClick={() => { setMode("admin"); setErr(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === "admin" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >Admin</button>
        </div>

        {mode === "client" && stage === "enter" && (
          <form onSubmit={requestOtp} className="space-y-3">
            <input
              type="email"
              className={inputCls}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button disabled={busy} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Sending…" : "Send code to email"}
            </button>
          </form>
        )}
        {mode === "client" && stage === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-3">
            <p className="text-xs text-gray-500">We sent a 6-digit code to <strong>{email}</strong>.</p>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              className={`${inputCls} text-center tracking-widest font-mono`}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button disabled={busy} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button type="button" onClick={() => setStage("enter")} className="w-full text-xs text-gray-500 hover:text-gray-700">
              Use a different email
            </button>
          </form>
        )}
        {mode === "admin" && (
          <form onSubmit={adminLogin} className="space-y-3">
            <input
              type="password"
              className={inputCls}
              placeholder="Master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button disabled={busy} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in as admin"}
            </button>
          </form>
        )}

        {err && <p className="mt-3 text-xs text-red-500">{err}</p>}
      </div>
    </div>
  );
}
