// Parametric dieline for a ROLL-END TUCK-TOP mailer (FEFCO 0427 style) —
// the e-commerce / mailer box: base with rolled double side walls, hinged lid
// with dust flaps and a rounded tuck that closes over the front.
//
// Construction is the STANDARD 0427 layout (per-panel thickness allowances
// driven by the selected board caliper), not reverse-engineered from an Aeros
// production die — treat the first cut as a prototype. Dimensions are the
// INTERNAL L x W x H.

import { PT_PER_MM } from "./cakebox.js";

export function buildTuckboxDieline({ L, W, H, thickness, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Lm = toMm(L); // internal length (lid hinge runs along L)
  const D = toMm(W); // internal width / depth
  const Hm = toMm(H); // internal height
  const t = +thickness > 0 ? +thickness : 1.5;

  const warnings = [];
  if (!(Lm > 0) || !(D > 0) || !(Hm > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  if (Hm < 4 * t) warnings.push("Height under 4x board thickness — rolled sides will not form.");
  if (D < 6 * Math.max(20, Math.min(35, D / 6))) {
    /* tabs/slots always fit at D >= ~60; warn below that */
  }
  if (D < 60) warnings.push("Width under 60 mm — lock tabs and slots crowd each other.");
  warnings.push("Standard FEFCO 0427 construction (not from an Aeros production die) — prototype the first cut.");

  const hi = Math.max(10, Hm - 1.5 * t); // inner rolled side panel
  const hd = Math.max(10, Hm - 2); // dust flap depth
  const Ht = Math.max(12, Hm - 2); // tuck depth
  const hr = Math.max(10, Hm - 2 * t); // front roll-over depth
  const rT = Math.min(10, Ht / 3); // tuck corner radius
  const rD = Math.min(8, hd / 3); // dust corner radius
  const lidW = Lm + 2 * t; // lid overlaps the rolled sides
  const tuckW = Lm - 2 * t;

  // row boundaries (y, top -> bottom)
  const y1 = Ht; // tuck | lid
  const y2 = y1 + D + t; // lid | back
  const y3 = y2 + Hm; // back | base
  const y4 = y3 + D; // base | front
  const y5 = y4 + Hm; // front | roll
  const y6 = y5 + hr;

  const cx = Math.max(Lm / 2 + Hm + t + hi + 8, lidW / 2 + hd); // centre x (8 = lock-tab protrusion)
  const segs = [];
  const line = (layer, x1, yy1, x2, yy2) => segs.push({ layer, kind: "l", pts: [[x1, yy1], [x2, yy2]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });
  const arc = (layer, x1, yy1, x2, yy2, cxA, cyA) => {
    // quarter arc from (x1,y1) to (x2,y2) around corner point (cxA,cyA)
    const k = 0.5523;
    bez(layer, [x1, yy1], [x1 + (cxA - x1) * k, yy1 + (cyA - yy1) * k], [x2 + (cxA - x2) * k, yy2 + (cyA - yy2) * k], [x2, yy2]);
  };
  // mirrored helpers: run f for both sides, xm maps a left-side x to the current side
  const both = (f) => { f((x) => cx - x); f((x) => cx + x); };

  // ---------- tuck (rounded, centred) ----------
  both((xm) => {
    line("cut", xm(tuckW / 2), y1, xm(tuckW / 2), rT);
    arc("cut", xm(tuckW / 2), rT, xm(tuckW / 2 - rT), 0, xm(tuckW / 2), 0);
  });
  line("cut", cx - (tuckW / 2 - rT), 0, cx + (tuckW / 2 - rT), 0);
  line("crease", cx - tuckW / 2, y1, cx + tuckW / 2, y1);

  // ---------- lid row with dust flaps ----------
  both((xm) => {
    line("cut", xm(tuckW / 2), y1, xm(lidW / 2), y1); // step tuck -> lid edge
    line("crease", xm(lidW / 2), y1, xm(lidW / 2), y2); // lid | dust fold
    // dust flap: 45° lead-in, outer edge, rounded bottom corner, back to fold
    line("cut", xm(lidW / 2), y1, xm(lidW / 2 + hd), y1 + hd);
    line("cut", xm(lidW / 2 + hd), y1 + hd, xm(lidW / 2 + hd), y2 - rD);
    arc("cut", xm(lidW / 2 + hd), y2 - rD, xm(lidW / 2 + hd - rD), y2, xm(lidW / 2 + hd), y2);
    line("cut", xm(lidW / 2 + hd - rD), y2, xm(lidW / 2), y2);
    // step from lid width down to back width
    line("cut", xm(lidW / 2), y2, xm(Lm / 2), y2);
  });
  line("crease", cx - lidW / 2, y2, cx + lidW / 2, y2); // lid | back fold

  // ---------- back wall ----------
  both((xm) => line("cut", xm(Lm / 2), y2, xm(Lm / 2), y3));
  line("crease", cx - Lm / 2, y3, cx + Lm / 2, y3); // back | base fold

  // ---------- base row with rolled sides, corner ears and lock tabs ----------
  const ear = Math.max(10, Hm - t); // corner ear depth (wraps back/front wall ends)
  const ch = Math.min(12, ear / 2); // ear chamfer on the roll side
  const tabL = Math.max(20, Math.min(35, D / 6)); // lock tab / base slot length
  const tabD = 8; // lock tab protrusion
  const tabY1 = y3 + D / 6; // tab & slot positions (two per side)
  const tabY2 = y4 - D / 6 - tabL;
  both((xm) => {
    line("crease", xm(Lm / 2), y3, xm(Lm / 2), y4); // base | side fold
    // corner EARS on the outer side wall (fold along y3 / y4)
    for (const [ye, dir] of [[y3, -1], [y4, +1]]) {
      line("crease", xm(Lm / 2 + t), ye, xm(Lm / 2 + Hm), ye); // ear fold
      line("cut", xm(Lm / 2 + t), ye, xm(Lm / 2 + t), ye + dir * ear);
      line("cut", xm(Lm / 2 + t), ye + dir * ear, xm(Lm / 2 + Hm - ch), ye + dir * ear);
      line("cut", xm(Lm / 2 + Hm - ch), ye + dir * ear, xm(Lm / 2 + Hm), ye + dir * (ear - ch));
      line("cut", xm(Lm / 2 + Hm), ye + dir * (ear - ch), xm(Lm / 2 + Hm), ye);
      line("cut", xm(Lm / 2), ye, xm(Lm / 2 + t), ye); // clearance nick at the base fold corner
    }
    // roll zone + inner panel (top/bottom edges cut only beyond the ear fold)
    line("cut", xm(Lm / 2 + Hm), y3, xm(Lm / 2 + Hm + t + hi), y3);
    line("cut", xm(Lm / 2 + Hm), y4, xm(Lm / 2 + Hm + t + hi), y4);
    line("crease", xm(Lm / 2 + Hm), y3, xm(Lm / 2 + Hm), y4); // roll crease 1
    line("crease", xm(Lm / 2 + Hm + t), y3, xm(Lm / 2 + Hm + t), y4); // roll crease 2
    // inner panel free edge with two lock TABS
    const xe = Lm / 2 + Hm + t + hi;
    line("cut", xm(xe), y3, xm(xe), tabY1);
    for (const ty of [tabY1, tabY2]) {
      line("cut", xm(xe), ty, xm(xe + tabD), ty + 2);
      line("cut", xm(xe + tabD), ty + 2, xm(xe + tabD), ty + tabL - 2);
      line("cut", xm(xe + tabD), ty + tabL - 2, xm(xe), ty + tabL);
    }
    line("cut", xm(xe), tabY1 + tabL, xm(xe), tabY2);
    line("cut", xm(xe), tabY2 + tabL, xm(xe), y4);
    // matching lock SLOTS in the base, just inside the side fold
    for (const ty of [tabY1, tabY2]) {
      line("cut", xm(Lm / 2 - 3), ty, xm(Lm / 2 - 3), ty + tabL);
    }
  });
  line("crease", cx - Lm / 2, y4, cx + Lm / 2, y4); // base | front fold

  // ---------- front wall + roll-over ----------
  both((xm) => {
    line("cut", xm(Lm / 2), y4, xm(Lm / 2), y5);
    line("cut", xm(Lm / 2), y5, xm(tuckW / 2), y5); // step front -> roll width
    line("cut", xm(tuckW / 2), y5, xm(tuckW / 2), y6 - rT);
    arc("cut", xm(tuckW / 2), y6 - rT, xm(tuckW / 2 - rT), y6, xm(tuckW / 2), y6);
  });
  line("crease", cx - tuckW / 2, y5, cx + tuckW / 2, y5); // front | roll fold
  line("cut", cx - (tuckW / 2 - rT), y6, cx + (tuckW / 2 - rT), y6);

  const S = PT_PER_MM;
  const segments = segs.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: 2 * cx * S, heightPt: y6 * S, flapDepthPt: Hm * S, style: "tuckbox" };

  const dims = [
    { x1: (cx - Lm / 2) * S, y1: (y3 + D / 2) * S, x2: (cx + Lm / 2) * S, y2: (y3 + D / 2) * S, valuePt: Lm * S, rotated: false },
    { x1: (cx + Lm / 2 + Hm + t + hi) * S + 17, y1: y3 * S, x2: (cx + Lm / 2 + Hm + t + hi) * S + 17, y2: y4 * S, valuePt: D * S, rotated: true },
    { x1: (cx - Lm / 2) * S - 17, y1: y2 * S, x2: (cx - Lm / 2) * S - 17, y2: y3 * S, valuePt: Hm * S, rotated: true },
    { x1: 0, y1: y6 * S + 17, x2: 2 * cx * S, y2: y6 * S + 17, valuePt: 2 * cx * S, rotated: false },
  ];

  return { segments, blank, dims, warnings, valid: true };
}
