// PILLOW BOX dieline — two curved faces sharing side creases, curved tuck
// flaps at both ends, glued side seam. Standard construction.
// Inputs: L = box length (between end-fold chords), W = face width (flat),
// H is unused for geometry (pillow depth emerges from the curve) but kept for
// the shared input UI; sagitta = 0.18 x W.

import { PT_PER_MM } from "./cakebox.js";

export function buildPillowboxDieline({ L, W, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Lm = toMm(L);
  const Wm = toMm(W);

  const warnings = [];
  if (!(Lm > 0) || !(Wm > 0)) {
    return { segments: [], blank: null, warnings: ["Length and width must be positive."], valid: false };
  }
  const s = 0.18 * Wm; // end-curve sagitta
  const f = Math.max(10, Math.min(18, 0.15 * Wm)); // curved tuck flap depth
  const g = 15; // glue flap
  const BH = Lm + 2 * (s + f);
  const x1 = Wm, x2 = 2 * Wm, xE = 2 * Wm + g;
  warnings.push("Standard pillow-box construction — prototype the first cut.");
  if (Lm < Wm) warnings.push("Length shorter than width — unusual pillow proportions.");

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  // parabolic arc through apex via quadratic->cubic
  const arcQ = (layer, p0, apex, p2) => {
    const C = [apex[0], 2 * apex[1] - (p0[1] + p2[1]) / 2];
    const c1 = [p0[0] + (2 / 3) * (C[0] - p0[0]), p0[1] + (2 / 3) * (C[1] - p0[1])];
    const c2 = [p2[0] + (2 / 3) * (C[0] - p2[0]), p2[1] + (2 / 3) * (C[1] - p2[1])];
    segs.push({ layer, kind: "c", pts: [p0, c1, c2, p2] });
  };

  for (const [yEdge, yCrease, apexE, apexC] of [
    [s, s + f, 0, f], // top end
    [BH - s, BH - s - f, BH, BH - f], // bottom end
  ]) {
    // cut arcs (tuck flap outer edges), one per face
    arcQ("cut", [0, yEdge], [Wm / 2, apexE], [x1, yEdge]);
    arcQ("cut", [x1, yEdge], [x1 + Wm / 2, apexE], [x2, yEdge]);
    // fold arcs (curved creases)
    arcQ("crease", [0, yCrease], [Wm / 2, apexC], [x1, yCrease]);
    arcQ("crease", [x1, yCrease], [x1 + Wm / 2, apexC], [x2, yCrease]);
    // glue-flap end edge
    line("cut", x2, yEdge, xE - 3, yEdge + (yCrease > yEdge ? 3 : -3));
  }
  // side edges + creases + glue flap
  line("cut", 0, s, 0, BH - s);
  line("crease", x1, s + f, x1, BH - s - f);
  line("crease", x2, s + f, x2, BH - s - f);
  line("cut", xE - 3, s + 3, xE, s + 10);
  line("cut", xE, s + 10, xE, BH - s - 10);
  line("cut", xE, BH - s - 10, xE - 3, BH - s - 3);

  const S = PT_PER_MM;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: xE * S, heightPt: BH * S, flapDepthPt: f * S, style: "pillowbox" };
  const dims = [
    { x1: 0, y1: (BH / 2) * S, x2: x1 * S, y2: (BH / 2) * S, valuePt: Wm * S, rotated: false },
    { x1: (xE + 6) * S, y1: (s + f) * S, x2: (xE + 6) * S, y2: (BH - s - f) * S, valuePt: Lm * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: xE * S, y2: BH * S + 17, valuePt: xE * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
