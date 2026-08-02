// GABLE BOX dieline — carry-out box with roof gables and a carry handle.
// Standard construction: body of four panels + glue flap; the two L panels
// carry the gable roof creases and the handle strip (with hand hole); the two
// W panels carry centre-creased fold-in gussets; crash-lock style bottom
// flaps (simplified). Prototype the first cut.

import { PT_PER_MM } from "./cakebox.js";

export function buildGableboxDieline({ L, W, H, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Lm = toMm(L);
  const Wm = toMm(W);
  const Hm = toMm(H);

  const warnings = ["Standard gable-box construction — prototype the first cut."];
  if (!(Lm > 0) || !(Wm > 0) || !(Hm > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  const g = 15;
  const ga = 0.55 * Wm; // gable rise
  const hh = 32; // handle strip height
  const hw = Math.min(0.62 * Lm, 120); // handle strip width
  const dB = Wm / 2 + 12; // bottom flap depth

  const xF = g;
  const xS1 = xF + Lm;
  const xB = xS1 + Wm;
  const xS2 = xB + Lm;
  const xE = xS2 + Wm;
  const yTop = ga + hh; // roof + handle above body
  const y0 = yTop;
  const y1 = y0 + Hm;
  const BH = y1 + dB;

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });

  for (const x of [xF, xS1, xB, xS2]) line("crease", x, y0, x, y1);
  line("crease", xF, y0, xE, y0);
  line("crease", xF, y1, xE, y1);
  // glue flap
  line("cut", xF, y0, 3, y0 + 3);
  line("cut", 3, y0 + 3, 0, y0 + 10);
  line("cut", 0, y0 + 10, 0, y1 - 10);
  line("cut", 0, y1 - 10, 3, y1 - 3);
  line("cut", 3, y1 - 3, xF, y1);

  // ---- gable roofs + handle on the L panels ----
  for (const xa of [xF, xB]) {
    const cxm = xa + Lm / 2;
    // roof creases to the apex shoulders
    line("crease", xa, y0, cxm - hw / 2, y0 - ga);
    line("crease", xa + Lm, y0, cxm + hw / 2, y0 - ga);
    line("crease", cxm - hw / 2, y0 - ga, cxm + hw / 2, y0 - ga); // handle fold
    // roof outline (slanted sides)
    line("cut", xa, y0, cxm - hw / 2, y0 - ga);
    line("cut", xa + Lm, y0, cxm + hw / 2, y0 - ga);
    // handle strip with rounded top corners
    line("cut", cxm - hw / 2, y0 - ga, cxm - hw / 2, y0 - ga - hh + 6);
    bez("cut", [cxm - hw / 2, y0 - ga - hh + 6], [cxm - hw / 2, y0 - ga - hh + 1.5], [cxm - hw / 2 + 4.5, y0 - ga - hh], [cxm - hw / 2 + 6, y0 - ga - hh]);
    line("cut", cxm - hw / 2 + 6, y0 - ga - hh, cxm + hw / 2 - 6, y0 - ga - hh);
    bez("cut", [cxm + hw / 2 - 6, y0 - ga - hh], [cxm + hw / 2 - 1.5, y0 - ga - hh], [cxm + hw / 2, y0 - ga - hh + 1.5], [cxm + hw / 2, y0 - ga - hh + 6]);
    line("cut", cxm + hw / 2, y0 - ga - hh + 6, cxm + hw / 2, y0 - ga);
    // hand hole (stadium shape) centred in the strip
    const hhw = Math.min(70, hw - 24);
    const hhh = 18;
    const hy = y0 - ga - hh / 2;
    const r = hhh / 2;
    line("cut", cxm - hhw / 2 + r, hy - r, cxm + hhw / 2 - r, hy - r);
    bez("cut", [cxm + hhw / 2 - r, hy - r], [cxm + hhw / 2 - r + r * 1.1, hy - r], [cxm + hhw / 2 - r + r * 1.1, hy + r], [cxm + hhw / 2 - r, hy + r]);
    line("cut", cxm + hhw / 2 - r, hy + r, cxm - hhw / 2 + r, hy + r);
    bez("cut", [cxm - hhw / 2 + r, hy + r], [cxm - hhw / 2 + r - r * 1.1, hy + r], [cxm - hhw / 2 + r - r * 1.1, hy - r], [cxm - hhw / 2 + r, hy - r]);
  }

  // ---- fold-in gussets on the W panels ----
  for (const xa of [xS1, xS2]) {
    const cxm = xa + Wm / 2;
    line("crease", cxm, y0, cxm, y0 - ga + 2); // centre fold
    line("cut", xa, y0, cxm, y0 - ga + 2); // peak edges
    line("cut", xa + Wm, y0, cxm, y0 - ga + 2);
  }

  // ---- bottom: simplified crash-lock ----
  for (const xa of [xF, xB]) {
    line("cut", xa + 2, y1, xa + 2, y1 + dB - 5);
    bez("cut", [xa + 2, y1 + dB - 5], [xa + 2, y1 + dB - 1], [xa + 6, y1 + dB], [xa + 10, y1 + dB]);
    line("cut", xa + 10, y1 + dB, xa + Lm * 0.5, y1 + dB);
    line("cut", xa + Lm * 0.5, y1 + dB, xa + Lm * 0.5 + 4, y1 + Wm * 0.42);
    line("cut", xa + Lm * 0.5 + 4, y1 + Wm * 0.42, xa + Lm - 3, y1 + Wm * 0.42);
    line("cut", xa + Lm - 3, y1 + Wm * 0.42, xa + Lm, y1);
    line("cut", xa, y1, xa + 2, y1);
    line("crease", xa + 2, y1, xa + 2 + (dB - 2), y1 + dB - 2); // 45° forming crease
  }
  for (const xa of [xS1, xS2]) {
    const dS = Wm / 2 + 6;
    line("cut", xa + 1, y1, xa + 1, y1 + dS);
    line("cut", xa + 1, y1 + dS, xa + 1 + dS, y1 + dS);
    line("cut", xa + 1 + dS, y1 + dS, xa + Wm - 1, y1);
    line("crease", xa + 1, y1, xa + 1 + dS, y1 + dS); // 45° forming crease (inside the flap)
  }

  const S = PT_PER_MM;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: xE * S, heightPt: BH * S, flapDepthPt: (ga + hh) * S, style: "gablebox" };
  const dims = [
    { x1: xF * S, y1: (y0 + Hm / 2) * S, x2: xS1 * S, y2: (y0 + Hm / 2) * S, valuePt: Lm * S, rotated: false },
    { x1: xS1 * S, y1: (y0 + Hm / 2 + 10) * S, x2: xB * S, y2: (y0 + Hm / 2 + 10) * S, valuePt: Wm * S, rotated: false },
    { x1: (xE + 6) * S, y1: y0 * S, x2: (xE + 6) * S, y2: y1 * S, valuePt: Hm * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: xE * S, y2: BH * S + 17, valuePt: xE * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
