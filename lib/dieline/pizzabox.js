// PIZZA BOX dieline (corrugated, FEFCO 0426 family) — one-piece box with
// hinged lid, front tuck, side walls with corner ears and lid side lips.
// Standard construction sized for E/B flute; prototype the first cut.
// Internal L (front width) x W (depth) x H.

import { PT_PER_MM } from "./cakebox.js";

export function buildPizzaboxDieline({ L, W, H, thickness, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Lm = toMm(L);
  const D = toMm(W);
  const Hm = toMm(H);
  const t = +thickness > 0 ? +thickness : 2.8;

  const warnings = ["Standard pizza-box (0426 family) construction — prototype the first cut."];
  if (!(Lm > 0) || !(D > 0) || !(Hm > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  if (Hm < 8 * 3) warnings.push("Very low height for corrugated walls.");

  const lip = Hm - t; // lid front lip
  const sip = Hm - t; // lid side lips
  const ear = Hm; // base side-wall front ears (fold behind the front wall)
  const tuck = Hm - 2; // front wall fold-over

  // rows (top -> bottom): lid front lip | LID (D) | back wall (H) | BASE (D) | front (H) | fold-over
  const y1 = lip;
  const y2 = y1 + D + t;
  const y3 = y2 + Hm;
  const y4 = y3 + D;
  const y5 = y4 + Hm;
  const y6 = y5 + tuck;
  const lidW = Lm + 2 * t;
  const cx = Math.max(Lm / 2 + Hm, lidW / 2 + sip);

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  const both = (f) => { f((x) => cx - x); f((x) => cx + x); };

  // ---- lid front lip ----
  line("cut", cx - lidW / 2 + 6, 0, cx + lidW / 2 - 6, 0);
  both((xm) => line("cut", xm(lidW / 2 - 6), 0, xm(lidW / 2), y1));
  line("crease", cx - lidW / 2, y1, cx + lidW / 2, y1);

  // ---- lid with side lips ----
  both((xm) => {
    line("crease", xm(lidW / 2), y1, xm(lidW / 2), y2); // lid | side lip fold
    line("cut", xm(lidW / 2), y1, xm(lidW / 2 + sip), y1 + sip); // 45° lead-in
    line("cut", xm(lidW / 2 + sip), y1 + sip, xm(lidW / 2 + sip), y2 - 4);
    line("cut", xm(lidW / 2 + sip), y2 - 4, xm(lidW / 2), y2);
    line("cut", xm(lidW / 2), y2, xm(Lm / 2), y2); // step lid -> back width
  });
  line("crease", cx - lidW / 2, y2, cx + lidW / 2, y2); // lid | back fold

  // ---- back wall ----
  both((xm) => line("cut", xm(Lm / 2), y2, xm(Lm / 2), y3));
  line("crease", cx - Lm / 2, y3, cx + Lm / 2, y3);

  // ---- base with side walls + front ears ----
  both((xm) => {
    line("crease", xm(Lm / 2), y3, xm(Lm / 2), y4); // base | side fold
    line("cut", xm(Lm / 2), y3, xm(Lm / 2 + Hm), y3); // side wall back edge
    line("cut", xm(Lm / 2 + Hm), y3, xm(Lm / 2 + Hm), y4); // side wall outer edge
    // front ear: extends beyond y4, folds behind the front wall
    line("crease", xm(Lm / 2 + 2), y4, xm(Lm / 2 + Hm), y4);
    line("cut", xm(Lm / 2 + 2), y4, xm(Lm / 2 + 2), y4 + ear * 0.85);
    line("cut", xm(Lm / 2 + 2), y4 + ear * 0.85, xm(Lm / 2 + Hm - 8), y4 + ear);
    line("cut", xm(Lm / 2 + Hm - 8), y4 + ear, xm(Lm / 2 + Hm), y4 + 6);
    line("cut", xm(Lm / 2 + Hm), y4 + 6, xm(Lm / 2 + Hm), y4);
    line("cut", xm(Lm / 2), y4, xm(Lm / 2 + 2), y4); // nick
  });
  line("crease", cx - Lm / 2, y4, cx + Lm / 2, y4); // base | front fold

  // ---- front wall + fold-over tuck (with corner slots for the lid lip) ----
  both((xm) => {
    line("cut", xm(Lm / 2), y4, xm(Lm / 2), y5);
    line("cut", xm(Lm / 2), y5, xm(Lm / 2 - 4), y5);
  });
  line("crease", cx - (Lm / 2 - 4), y5, cx + (Lm / 2 - 4), y5); // fold-over crease
  both((xm) => {
    line("cut", xm(Lm / 2 - 4), y5, xm(Lm / 2 - 6), y6);
    line("cut", xm(Lm / 2 - 6), y6, xm(0), y6);
  });

  const S = PT_PER_MM;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: 2 * cx * S, heightPt: y6 * S, flapDepthPt: Hm * S, style: "pizzabox" };
  const dims = [
    { x1: (cx - Lm / 2) * S, y1: (y3 + D / 2) * S, x2: (cx + Lm / 2) * S, y2: (y3 + D / 2) * S, valuePt: Lm * S, rotated: false },
    { x1: (cx + Lm / 2 + Hm) * S + 17, y1: y3 * S, x2: (cx + Lm / 2 + Hm) * S + 17, y2: y4 * S, valuePt: D * S, rotated: true },
    { x1: (cx - Lm / 2) * S - 17, y1: y2 * S, x2: (cx - Lm / 2) * S - 17, y2: y3 * S, valuePt: Hm * S, rotated: true },
    { x1: 0, y1: y6 * S + 17, x2: 2 * cx * S, y2: y6 * S + 17, valuePt: 2 * cx * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
