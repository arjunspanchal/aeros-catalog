"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-white";
const labelCls = "block text-xs font-medium text-gray-500 mb-1 dark:text-gray-400";

const EMPTY_SIGNUP = { name: "", company: "", location: "", email: "", phone: "" };

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";
  // Modes: "client" (existing user OTP), "admin" (master password), "signup" (new client)
  const [mode, setMode] = useState("client");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(EMPTY_SIGNUP);
  // Stages per mode — "enter" -> form, "otp" -> OTP entry.
  const [stage, setStage] = useState("enter");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function switchMode(next) {
    setMode(next);
    setErr("");
    setStage("enter");
  }

  async function requestOtp(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/auth/request-otp", {
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
    // The email to verify depends on which mode we arrived at the OTP stage from.
    const targetEmail = mode === "signup" ? signup.email.trim().toLowerCase() : email;
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, code: otp }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    router.push(next);
  }

  async function adminLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    router.push(next);
  }

  async function submitSignup(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signup),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    setOtp("");
    setStage("otp");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-6 dark:bg-gray-900 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Welcome to Aeros</h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {mode === "signup"
            ? "Create a client account for the rate calculator."
            : "Sign in to access your tools."}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 mb-5">
          <button
            onClick={() => switchMode("client")}
            className={`py-2 rounded-lg text-sm font-medium ${mode === "client" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
          >Email</button>
          <button
            onClick={() => switchMode("signup")}
            className={`py-2 rounded-lg text-sm font-medium ${mode === "signup" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
          >Sign up</button>
          <button
            onClick={() => switchMode("admin")}
            className={`py-2 rounded-lg text-sm font-medium ${mode === "admin" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
          >Admin</button>
        </div>

        {/* --- EMAIL (existing user OTP) --- */}
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
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              New customer?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="text-blue-600 hover:underline dark:text-blue-400">
                Create an account
              </button>
            </p>
          </form>
        )}

        {/* --- SIGN UP (new client) --- */}
        {mode === "signup" && stage === "enter" && (
          <form onSubmit={submitSignup} className="space-y-3">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                placeholder="Jane Doe"
                value={signup.name}
                onChange={(e) => setSignup({ ...signup, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Company name</label>
              <input
                className={inputCls}
                placeholder="Acme Foods Pvt. Ltd."
                value={signup.company}
                onChange={(e) => setSignup({ ...signup, company: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input
                className={inputCls}
                placeholder="e.g. Mumbai, India"
                value={signup.location}
                onChange={(e) => setSignup({ ...signup, location: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                className={inputCls}
                placeholder="you@company.com"
                value={signup.email}
                onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                className={inputCls}
                placeholder="+91 98765 43210"
                value={signup.phone}
                onChange={(e) => setSignup({ ...signup, phone: e.target.value })}
              />
            </div>
            <button disabled={busy} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Creating account…" : "Create account & send code"}
            </button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("client")} className="text-blue-600 hover:underline dark:text-blue-400">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* --- OTP (shared by client + signup) --- */}
        {(mode === "client" || mode === "signup") && stage === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We sent a 6-digit code to{" "}
              <strong>{mode === "signup" ? signup.email : email}</strong>.
            </p>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              className={`${inputCls} text-center tracking-widest font-mono`}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button disabled={busy} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Verifying…" : mode === "signup" ? "Verify & finish sign-up" : "Verify & sign in"}
            </button>
            <button type="button" onClick={() => setStage("enter")} className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              {mode === "signup" ? "Edit details" : "Use a different email"}
            </button>
          </form>
        )}

        {/* --- ADMIN --- */}
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
