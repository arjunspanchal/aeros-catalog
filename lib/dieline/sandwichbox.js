// SANDWICH WEDGE BOX dieline — triangular-prism (right-isosceles) box with a
// window in the sloping face, calibrated to Aeros's production punch
// "SANDWICH BOX PUNCH 4.5in x 2.2in 300gsm" (blank 234 x 304 mm).
//
// Inputs: L = sandwich SIDE (triangle leg, 4.5 in), W = DEPTH (2.2 in).
// The hypotenuse (sloping face) is side x sqrt2. Layout of the die:
//
//        [tuck tab]
//        [BACK WALL  side x depth]
//   strip[TRI A     ]\  sloping face (side*sqrt2 x depth, window) — rotated 45°
//                     \[TRI B ]strip
//                       [BASE  side x depth][spine flap]
//                       [tuck tab]
//
// Tri A hinges on the back wall + the sloping face; Tri B on the base + the
// sloping face. Each triangle's third leg carries a 14 mm lock strip with a
// slot that receives the opposite panel's tuck tab. Wings on the sloping
// face's short ends tuck inside; the base's spine flap glues inside the back
// wall. Constants (tab, ears, strips, wing tapers) are the die maker's and
// stay fixed; panels scale with side/depth. RED = cut, GREEN = crease.

import { PT_PER_MM } from "./cakebox.js";

const S2 = Math.SQRT1_2;
const KAPPA = 0.5522847498;
const TAB_D = 18.7, EAR = 3.3, EAR_Y = 2.8, TAB_R = 4;
const STRIP = 14, CHAMFER = 3.7, SLOT_OFF = 2;
const WING_A_TAPER = 4.7, WING_B_TAPER = 2.7, FLAP_TAPER = 4.7;

export const SANDWICH_CONST = { TAB_D, EAR, STRIP, WING_A_TAPER, WING_B_TAPER, FLAP_TAPER };

export function buildSandwichboxDieline({ L, W, windowW, windowH, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Wd = toMm(L); // sandwich side (triangle leg)
  const D = toMm(W); // depth

  const warnings = ["Calibrated to the 4.5 x 2.2 in production punch (300 gsm) — die-exact at that size; other sizes scale the panels and keep the die maker's tab/strip constants."];
  if (!(Wd > 0) || !(D > 0)) {
    return { segments: [], blank: null, warnings: ["Side and depth must be positive."], valid: false };
  }
  if (D < 30) warnings.push("Depth under 30 mm — wings and tabs get very tight.");
  if (Wd < 70) warnings.push("Side under 70 mm — the tuck tabs and slots crowd; check the preview.");

  const Hyp = Wd * Math.SQRT2;
  const TAB_W = 0.465 * Wd, hw = TAB_W / 2;
  const SLOT_L = TAB_W + 5.6;
  const dA = D - 2.7, dB = 0.55 * D, dF = D + 5;
  const wl = windowW === undefined ? 0.49 * Hyp : toMm(windowW);
  const ww = windowH === undefined ? 0.55 * D : toMm(windowH);
  const hasWin = wl > 0 && ww > 0;
  if (hasWin && (wl > Hyp - 20 || ww > D - 12)) warnings.push("Window leaves under 6-10 mm of board around it — reduce it.");

  // ---- anchors (mm, y down) ----
  const xL = 40, yT = TAB_D;
  const yA = yT + D;
  const A = [xL, yA]; // Tri A right angle
  const P2 = [xL + Wd, yA];
  const P3 = [xL, yA + Wd];
  const Q1 = [P2[0] + D * S2, P2[1] + D * S2];
  const Q2 = [P3[0] + D * S2, P3[1] + D * S2];
  const RB = [Q1[0], Q2[1]]; // Tri B right angle
  const yBb = Q2[1] + D; // base bottom
  const xc1 = xL + Wd / 2, xc2 = Q2[0] + Wd / 2;

  const segs = [];
  const line = (layer, a, b) => segs.push({ layer, kind: "l", pts: [a, b] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });
  const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const arc90 = (layer, p1, p2, corner) => {
    const k = KAPPA;
    bez(layer, p1, [p1[0] + (corner[0] - p1[0]) * k, p1[1] + (corner[1] - p1[1]) * k], [p2[0] + (corner[0] - p2[0]) * k, p2[1] + (corner[1] - p2[1]) * k], p2);
  };

  // ---- back wall + tab ----
  const tab = (xc, y0, dir) => {
    line("crease", [xc - hw, y0], [xc + hw, y0]);
    line("cut", [xc - hw, y0], [xc - hw - EAR, y0 + dir * EAR_Y]);
    line("cut", [xc - hw - EAR, y0 + dir * EAR_Y], [xc - hw, y0 + dir * (TAB_D - TAB_R)]);
    arc90("cut", [xc - hw, y0 + dir * (TAB_D - TAB_R)], [xc - hw + TAB_R, y0 + dir * TAB_D], [xc - hw, y0 + dir * TAB_D]);
    line("cut", [xc - hw + TAB_R, y0 + dir * TAB_D], [xc + hw - TAB_R, y0 + dir * TAB_D]);
    arc90("cut", [xc + hw - TAB_R, y0 + dir * TAB_D], [xc + hw, y0 + dir * (TAB_D - TAB_R)], [xc + hw, y0 + dir * TAB_D]);
    line("cut", [xc + hw, y0 + dir * (TAB_D - TAB_R)], [xc + hw + EAR, y0 + dir * EAR_Y]);
    line("cut", [xc + hw + EAR, y0 + dir * EAR_Y], [xc + hw, y0]);
  };
  line("cut", [xL, yT], [xc1 - hw, yT]);
  tab(xc1, yT, -1);
  line("cut", [xc1 + hw, yT], [xL + Wd, yT]);
  line("cut", [xL, yT], A);
  line("cut", [xL + Wd, yT], P2);
  line("crease", A, P2); // Tri A leg (back wall hinge)

  // ---- Tri A left leg: lock strip with slot ----
  const slotStrip = (top, bot, side) => {
    // side = -1 strip to the left, +1 to the right; slot centred on the leg
    const x = top[0];
    const ys0 = top[1] + (Wd - SLOT_L) / 2, ys1 = ys0 + SLOT_L;
    line("crease", top, [x, ys0]);
    line("crease", [x, ys1], bot);
    line("cut", [x, ys0], [x + side * SLOT_OFF, ys0 + 1]);
    line("cut", [x + side * SLOT_OFF, ys0 + 1], [x + side * SLOT_OFF, ys1 - 1]);
    line("cut", [x + side * SLOT_OFF, ys1 - 1], [x, ys1]);
    line("cut", top, [x + side * STRIP, top[1] + CHAMFER]);
    line("cut", [x + side * STRIP, top[1] + CHAMFER], [x + side * STRIP, bot[1] - CHAMFER]);
    line("cut", [x + side * STRIP, bot[1] - CHAMFER], bot);
  };
  slotStrip(A, P3, -1);

  // ---- sloping face (4 creases) + wings ----
  line("crease", P2, P3);
  line("crease", P3, Q2);
  line("crease", Q2, Q1);
  line("crease", Q1, P2);
  const uA = [S2, -S2], vE = [S2, S2]; // wing A outward / along-edge
  const wa1 = add(add(P2, uA, dA), vE, WING_A_TAPER);
  const wa2 = add(add(Q1, uA, dA), vE, -WING_A_TAPER);
  line("cut", P2, wa1);
  line("cut", wa1, wa2);
  line("cut", wa2, Q1);
  const uB = [-S2, S2];
  const wb1 = add(add(P3, uB, dB), vE, WING_B_TAPER);
  const wb2 = add(add(Q2, uB, dB), vE, -WING_B_TAPER);
  line("cut", P3, wb1);
  line("cut", wb1, wb2);
  line("cut", wb2, Q2);

  // window: rounded rect centred on the sloping face, long axis along P2->P3
  if (hasWin) {
    const C = [(P2[0] + P3[0] + Q1[0] + Q2[0]) / 4, (P2[1] + P3[1] + Q1[1] + Q2[1]) / 4];
    const u = [-S2, S2], v = [S2, S2];
    const r = Math.min(4.7, ww / 3, wl / 3);
    const at = (a, b) => [C[0] + a * u[0] + b * v[0], C[1] + a * u[1] + b * v[1]];
    const a1 = wl / 2, b1 = ww / 2;
    line("cut", at(-a1 + r, -b1), at(a1 - r, -b1));
    arc90("cut", at(a1 - r, -b1), at(a1, -b1 + r), at(a1, -b1));
    line("cut", at(a1, -b1 + r), at(a1, b1 - r));
    arc90("cut", at(a1, b1 - r), at(a1 - r, b1), at(a1, b1));
    line("cut", at(a1 - r, b1), at(-a1 + r, b1));
    arc90("cut", at(-a1 + r, b1), at(-a1, b1 - r), at(-a1, b1));
    line("cut", at(-a1, b1 - r), at(-a1, -b1 + r));
    arc90("cut", at(-a1, -b1 + r), at(-a1 + r, -b1), at(-a1, -b1));
  }

  // ---- Tri B: base hinge + right leg strip ----
  line("crease", Q2, RB); // base top (Tri B leg)
  slotStrip(Q1, RB, +1);

  // ---- base + spine flap + tab ----
  line("cut", Q2, [Q2[0], yBb]); // free left edge (meets the sloping face's wing B)
  line("crease", RB, [RB[0], yBb]); // spine flap hinge
  line("cut", RB, [RB[0] + dF, RB[1] + FLAP_TAPER]);
  line("cut", [RB[0] + dF, RB[1] + FLAP_TAPER], [RB[0] + dF, yBb - FLAP_TAPER]);
  line("cut", [RB[0] + dF, yBb - FLAP_TAPER], [RB[0], yBb]);
  line("cut", [Q2[0], yBb], [xc2 - hw, yBb]);
  tab(xc2, yBb, +1);
  line("cut", [xc2 + hw, yBb], [RB[0], yBb]);

  // ---- normalise + scale ----
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (const s of segs) for (const p of [s.pts[0], s.pts[s.pts.length - 1]]) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
  }
  const S = PT_PER_MM;
  const segments = segs.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [(x - minX) * S, (y - minY) * S]) }));
  const BW = maxX - minX, BH = maxY - minY;
  const blank = { widthPt: BW * S, heightPt: BH * S, flapDepthPt: D * S, style: "sandwichbox" };
  const dims = [
    { x1: (Q2[0] - minX) * S, y1: (Q2[1] + D / 2 - minY) * S, x2: (RB[0] - minX) * S, y2: (Q2[1] + D / 2 - minY) * S, valuePt: Wd * S, rotated: false },
    { x1: (RB[0] + 6 - minX) * S, y1: (Q2[1] - minY) * S, x2: (RB[0] + 6 - minX) * S, y2: (yBb - minY) * S, valuePt: D * S, rotated: true },
    { x1: (xL - STRIP - 8 - minX) * S, y1: (yA - minY) * S, x2: (xL - STRIP - 8 - minX) * S, y2: (P3[1] - minY) * S, valuePt: Wd * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: BW * S, y2: BH * S + 17, valuePt: BW * S, rotated: false },
  ];
  // layout metadata for the 3D rig (mm, blank-normalised, y down)
  const layout = { xL: xL - minX, yT: yT - minY, side: Wd, depth: D, hyp: Hyp, dA, dB, dF, tabW: TAB_W + 2 * EAR, tabD: TAB_D, strip: STRIP, blankW: BW, blankH: BH };
  return { segments, blank, dims, warnings, valid: true, meta: layout };
}
