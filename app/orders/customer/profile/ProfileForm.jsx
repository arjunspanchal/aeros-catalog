"use client";
import { useState } from "react";
import { inputCls, labelCls } from "@/app/orders/_components/ui";

const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result || "";
      const idx = String(res).indexOf(",");
      resolve(String(res).slice(idx + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function ProfileForm({ initial }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    designation: initial?.designation || "",
    phone: initial?.phone || "",
  });
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  function onPickPhoto(file) {
    setErr("");
    if (!file) { setPhotoFile(null); setPhotoPreview(null); return; }
    if (!PHOTO_TYPES.has(file.type)) { setErr("Photo must be JPG, PNG, WebP, or GIF"); return; }
    if (file.size > PHOTO_MAX_BYTES) { setErr("Photo too large. Max 5 MB."); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save(e) {
    e.preventDefault();
    setErr(""); setOk(false); setBusy(true);
    const body = { ...form };
    if (photoFile) {
      body.photoBase64 = await readAsBase64(photoFile);
      body.photoFilename = photoFile.name;
      body.photoContentType = photoFile.type;
    }
    const res = await fetch("/api/orders/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error || "Failed"); return; }
    const data = await res.json();
    if (data.user?.photoUrl) setPhotoUrl(data.user.photoUrl);
    setPhotoFile(null); setPhotoPreview(null);
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  const avatarSrc = photoPreview || photoUrl;

  return (
    <form onSubmit={save} className="mt-6 bg-white border border-gray-200 rounded-xl p-5 space-y-4 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : initials(form.name, initial?.email)}
        </div>
        <div>
          <label className="inline-block">
            <span className="cursor-pointer px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-200">
              {avatarSrc ? "Change photo" : "Upload photo"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">JPG / PNG / WebP, up to 5 MB.</p>
        </div>
      </div>

      <div>
        <label className={labelCls}>Email</label>
        <input className={`${inputCls} opacity-60`} value={initial?.email || ""} disabled />
        <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">This is how you sign in. Contact Aeros to change.</p>
      </div>
      <div>
        <label className={labelCls}>Full name</label>
        <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vinay Dubey" />
      </div>
      <div>
        <label className={labelCls}>Designation</label>
        <input className={inputCls} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Brand Manager" />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button disabled={busy} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {busy ? "Saving…" : "Save profile"}
        </button>
        {ok && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </form>
  );
}
