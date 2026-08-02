// Folding CARTON dielines — the product-box family:
//   - Straight Tuck End (STE): top and bottom tucks on the same panel
//   - Reverse Tuck End (RTE): tucks on opposite panels
//   - Crash-lock bottom (snap/auto bottom) with tuck top
// Standard industry construction (no Aeros reference die yet) — the engine
// warns to prototype the first cut. Internal dims L (face width) x W (depth)
// x H (height); tuck/dust proportions follow common practice.

import { PT_PER_MM } from "./cakebox.js";

export const CARTON_TYPES = [
  { id: "ste", label: "Straight tuck end" },
  { id: "rte", label: "Reverse tuck end" },
  { id: "crashlock", label: "Tuck top + crash-lock bottom" },
];

export function buildCartonDieline({ L, W, H, cartonType = "rte", thickness, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Lm = toMm(L);
  const Wm = toMm(W);
  const Hm = toMm(H);
  const t = +thickness > 0 ? +thickness : 0.5;

  const warnings = [];
  if (!(Lm > 0) || !(Wm > 0) || !(Hm > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  if (Wm < 15) warnings.push("Depth under 15 mm — tucks and dust flaps get very tight.");
  warnings.push("Standard carton construction (no Aeros production reference) — prototype the first cut.");

  const g = 15; // glue flap
  const dT = Math.max(12, Math.min(35, 0.75 * Wm)); // tuck depth
  const rT = Math.min(6, dT / 2.5);
  const dD = Math.max(10, Wm - 2); // dust flap depth
  const topP = Wm; // top/bottom panel depth

  // panel x-positions: glue | FRONT | SIDE | BACK | SIDE
  const x0 = 0;
  const xF = g;
  const xS1 = xF + Lm;
  const xB = xS1 + Wm;
  const xS2 = xB + Lm;
  const xE = xS2 + Wm;

  // closure row extents
  const topH = topP + dT;
  const botTuck = cartonType !== "crashlock";
  const dCL = Wm / 2 + 14; // crash-lock main flap depth
  const dCS = Wm / 2 + 8; // crash-lock side flap depth
  const botH = botTuck ? topP + dT : dCL;
  const y0 = topH; // body top
  const y1 = y0 + Hm; // body bottom
  const BH = y1 + botH;

  const segs = [];
  const line = (layer, xx1, yy1, xx2, yy2) => segs.push({ layer, kind: "l", pts: [[xx1, yy1], [xx2, yy2]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });

  // ---- body creases ----
  for (const x of [xF, xS1, xB, xS2]) line("crease", x, y0, x, y1);
  // glue flap (chamfered)
  line("cut", xF, y0, x0 + 3, y0 + 3);
  line("cut", x0 + 3, y0 + 3, x0, y0 + 10);
  line("cut", x0, y0 + 10, x0, y1 - 10);
  line("cut", x0, y1 - 10, x0 + 3, y1 - 3);
  line("cut", x0 + 3, y1 - 3, xF, y1);

  // tuck closure on a panel [xa, xa+Lm], dir -1 = top, +1 = bottom
  const tuckClosure = (xa, dir) => {
    const yFold = dir === -1 ? y0 : y1;
    const yPanel = yFold + dir * topP;
    const yTuck = yPanel + dir * dT;
    line("crease", xa, yFold, xa + Lm, yFold);
    line("cut", xa, yFold, xa, yPanel);
    line("cut", xa + Lm, yFold, xa + Lm, yPanel);
    line("crease", xa + t, yPanel, xa + Lm - t, yPanel); // tuck fold (inset t)
    // tuck with shoulders + rounded corners
    line("cut", xa, yPanel, xa + t, yPanel);
    line("cut", xa + Lm - t, yPanel, xa + Lm, yPanel);
    line("cut", xa + t, yPanel, xa + t + 2, yPanel + dir * (dT - rT) * 0.35); // shoulder lead
    line("cut", xa + t + 2, yPanel + dir * (dT - rT) * 0.35, xa + t + 2, yTuck - dir * rT);
    const cr = (xc, x2) =>
      bez("cut", [xc, yTuck - dir * rT], [xc, yTuck - dir * rT * 0.45], [xc + (x2 - xc) * 0.45, yTuck], [x2, yTuck]);
    cr(xa + t + 2, xa + t + 2 + rT);
    line("cut", xa + t + 2 + rT, yTuck, xa + Lm - t - 2 - rT, yTuck);
    bez("cut", [xa + Lm - t - 2 - rT, yTuck], [xa + Lm - t - 2 - rT * 0.55, yTuck], [xa + Lm - t - 2, yTuck - dir * rT * 0.55], [xa + Lm - t - 2, yTuck - dir * rT]);
    line("cut", xa + Lm - t - 2, yTuck - dir * rT, xa + Lm - t - 2, yPanel + dir * (dT - rT) * 0.35);
    line("cut", xa + Lm - t - 2, yPanel + dir * (dT - rT) * 0.35, xa + Lm - t, yPanel);
  };

  // dust flap on a side panel [xa, xa+Wm]
  const dustFlap = (xa, dir) => {
    const yFold = dir === -1 ? y0 : y1;
    line("crease", xa + 1, yFold, xa + Wm - 1, yFold);
    line("cut", xa, yFold, xa + 1, yFold);
    line("cut", xa + Wm - 1, yFold, xa + Wm, yFold);
    line("cut", xa + 1, yFold, xa + 1 + 0.55 * dD, yFold + dir * dD); // 45-ish lead-in
    line("cut", xa + 1 + 0.55 * dD, yFold + dir * dD, xa + Wm - 4, yFold + dir * dD);
    bez("cut", [xa + Wm - 4, yFold + dir * dD], [xa + Wm - 1.5, yFold + dir * dD], [xa + Wm - 1, yFold + dir * dD * 0.6], [xa + Wm - 1, yFold + dir * dD * 0.4]);
    line("cut", xa + Wm - 1, yFold + dir * dD * 0.4, xa + Wm - 1, yFold);
  };

  // plain edge (no closure) across a panel
  const plainEdge = (xa, wid, dir) => {
    const yFold = dir === -1 ? y0 : y1;
    line("cut", xa, yFold, xa + wid, yFold);
  };

  // ---- top: tuck always on FRONT ----
  tuckClosure(xF, -1);
  dustFlap(xS1, -1);
  plainEdge(xB, Lm, -1);
  dustFlap(xS2, -1);

  // ---- bottom ----
  if (botTuck) {
    const xa = cartonType === "ste" ? xF : xB; // STE same panel, RTE opposite
    tuckClosure(xa, +1);
    dustFlap(xS1, +1);
    dustFlap(xS2, +1);
    plainEdge(cartonType === "ste" ? xB : xF, Lm, +1);
  } else {
    // crash-lock (auto) bottom — L panels carry the lock flaps, W panels the
    // glued triangles with 45° creases.
    for (const xa of [xF, xB]) {
      line("crease", xa, y1, xa + Lm, y1);
      // stepped lock flap: leading half deep with rounded corner, trailing half shallow
      line("cut", xa + 2, y1, xa + 2, y1 + dCL - 6);
      bez("cut", [xa + 2, y1 + dCL - 6], [xa + 2, y1 + dCL - 1.5], [xa + 6, y1 + dCL], [xa + 10, y1 + dCL]);
      line("cut", xa + 10, y1 + dCL, xa + Lm * 0.5, y1 + dCL);
      line("cut", xa + Lm * 0.5, y1 + dCL, xa + Lm * 0.5 + 4, y1 + Wm * 0.45); // lock step
      line("cut", xa + Lm * 0.5 + 4, y1 + Wm * 0.45, xa + Lm - 3, y1 + Wm * 0.45);
      line("cut", xa + Lm - 3, y1 + Wm * 0.45, xa + Lm, y1);
      line("cut", xa, y1, xa + 2, y1); // inset nick
      line("crease", xa + 2, y1, xa + 2 + (dCL - 2), y1 + dCL - 2); // 45° forming crease
    }
    for (const xa of [xS1, xS2]) {
      line("crease", xa, y1, xa + Wm, y1);
      line("cut", xa + 1, y1, xa + 1, y1 + dCS);
      line("cut", xa + 1, y1 + dCS, xa + 1 + dCS, y1 + dCS);
      line("cut", xa + 1 + dCS, y1 + dCS, xa + Wm - 1, y1);
      line("crease", xa + 1, y1, xa + 1 + dCS, y1 + dCS); // 45° forming crease (inside the flap)
    }
  }

  const S = PT_PER_MM;
  const segments = segs.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: xE * S, heightPt: BH * S, flapDepthPt: topP * S, style: "carton" };
  const dims = [
    { x1: xF * S, y1: (y0 + Hm / 2) * S, x2: xS1 * S, y2: (y0 + Hm / 2) * S, valuePt: Lm * S, rotated: false },
    { x1: xS1 * S, y1: (y0 + Hm / 2 + 10) * S, x2: xB * S, y2: (y0 + Hm / 2 + 10) * S, valuePt: Wm * S, rotated: false },
    { x1: (xE + 6) * S, y1: y0 * S, x2: (xE + 6) * S, y2: y1 * S, valuePt: Hm * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: xE * S, y2: BH * S + 17, valuePt: xE * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
