// Generate a rate-card ref like RC-PCKG-20260422-001. Prefix is derived from
// client name/company (fallback to first chunk of email); the numeric suffix
// comes from the count of existing cards for that client.

import { listCards } from "./store";

function slugifyPrefix(raw) {
  const s = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.slice(0, 8) || "CLIENT";
}

function dateStamp(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function nextCardRef({ clientEmail, clientName, brand }) {
  const prefixSource = clientName || clientEmail?.split("@")[0] || "";
  const prefix = slugifyPrefix(prefixSource);
  const brandSlug = brand ? `-${slugifyPrefix(brand)}` : "";
  const existing = await listCards({ clientEmail });
  const n = String(existing.length + 1).padStart(3, "0");
  return `RC-${prefix}${brandSlug}-${dateStamp()}-${n}`;
}
