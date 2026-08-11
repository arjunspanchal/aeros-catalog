// ONE-PIECE CUP CARRIER dieline — the glue-free two-cup carrier that drapes
// over the cups: a symmetric blank folded at the crest into back-to-back
// handle panels (aligned stadium hand-holes), sloped risers, and two wing
// panels whose punched holes slip over the cup bodies (the two wing layers
// stack when folded, supporting each cup at the rim taper).
//
//   [ wing A: 2 cup holes | riser | handle panel (hand hole) ]
//   ------------------------- crest fold -----------------------
//   [ handle panel (hand hole) | riser | wing B: 2 cup holes ]
//
// Inputs: L = cup hole Ø (cup body Ø at the support height + ~1 mm),
// W = cup pitch (centre-to-centre), H = handle panel height.
// Standard construction from the common commercial carrier — prototype the
// first cut and check the hole Ø against the actual cup taper.

import { PT_PER_MM } from "./cakebox.js";

const KAPPA = 0.5522847498;

export function buildCupcarrierDieline({ L, W, H, cups = 2, units = "mm" }) {
  if (+cups === 1) return buildSingleCarrier({ L, W, H, units });
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const holeD = toMm(L);
  const pitch = toMm(W);
  const handleH = toMm(H);

  const warnings = ["Standard one-piece carrier construction — prototype and verify hole Ø against the cup taper."];
  if (!(holeD > 0) || !(pitch > 0) || !(handleH > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  if (pitch < holeD + 12) warnings.push("Cup pitch leaves under 12 mm web between the holes — increase pitch.");
  const web = 22; // margin around holes to the blank edges
  const BW = 2 * pitch; // blank width (holes at ±pitch/2 from centre)
  if (BW < holeD + 2 * web) warnings.push("Blank too narrow for the hole diameter.");

  const wingD = holeD + 2 * web; // wing depth
  const riser = Math.max(28, holeD * 0.42); // sloped riser depth
  const rC = 24; // crest corner radius
  const rW = 14; // wing corner radius
  const half = wingD + riser + handleH;
  const BH = 2 * half;
  const cy = half; // crest fold y (blank centre)

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });
  const arc90 = (layer, x1, y1, x2, y2, cxa, cya) => {
    const k = KAPPA;
    bez(layer, [x1, y1], [x1 + (cxa - x1) * k, y1 + (cya - y1) * k], [x2 + (cxa - x2) * k, y2 + (cya - y2) * k], [x2, y2]);
  };

  // ---- outline (symmetric top/bottom halves; y = 0 is wing A outer edge) ----
  for (const dir of [-1, +1]) {
    // dir -1 = top half (wing A at top), +1 = bottom half mirrored about cy
    const m = (y) => cy + dir * (y - cy);
    const yWingEdge = m(cy - half); // outer wing edge
    const yWingIn = m(cy - half + wingD); // wing | riser fold
    const yRiserIn = m(cy - half + wingD + riser); // riser | handle fold
    // wing outer edge with rounded corners
    line("cut", rW, yWingEdge, BW - rW, yWingEdge);
    arc90("cut", BW - rW, yWingEdge, BW, m(cy - half + rW), BW, yWingEdge);
    arc90("cut", 0, m(cy - half + rW), rW, yWingEdge, 0, yWingEdge);
    // sides: wing zone straight, then taper in to the handle zone
    line("cut", 0, m(cy - half + rW), 0, yWingIn);
    line("cut", BW, m(cy - half + rW), BW, yWingIn);
    // riser sides taper toward the handle panel edges (inset 12 each side)
    line("cut", 0, yWingIn, 12, yRiserIn);
    line("cut", BW, yWingIn, BW - 12, yRiserIn);
    // handle panel sides up to the crest corner rounds
    line("cut", 12, yRiserIn, 12, m(cy - rC));
    line("cut", BW - 12, yRiserIn, BW - 12, m(cy - rC));
    if (dir === -1) {
      // full 180° side rounds through the crest (top edge -> crest -> bottom edge)
      arc90("cut", 12, cy - rC, 12 + rC, cy, 12, cy);
      arc90("cut", 12 + rC, cy, 12, cy + rC, 12, cy);
      arc90("cut", BW - 12 - rC, cy, BW - 12, cy - rC, BW - 12, cy);
      arc90("cut", BW - 12, cy + rC, BW - 12 - rC, cy, BW - 12, cy);
    }
    // folds
    line("crease", 0, yWingIn, BW, yWingIn);
    line("crease", 12, yRiserIn, BW - 12, yRiserIn);
    // hand hole (stadium 75 x 25) centred, 26 mm from the crest
    const hw = Math.min(78, BW - 80);
    const hh = 25;
    const hcy = m(cy - 26 - hh / 2);
    const r = hh / 2;
    const x1 = BW / 2 - hw / 2 + r, x2 = BW / 2 + hw / 2 - r;
    line("cut", x1, hcy - r * dir, x2, hcy - r * dir);
    line("cut", x1, hcy + r * dir, x2, hcy + r * dir);
    bez("cut", [x2, hcy - r * dir], [x2 + r * 1.1, hcy - r * dir], [x2 + r * 1.1, hcy + r * dir], [x2, hcy + r * dir]);
    bez("cut", [x1, hcy - r * dir], [x1 - r * 1.1, hcy - r * dir], [x1 - r * 1.1, hcy + r * dir], [x1, hcy + r * dir]);
    // cup holes in the wing (two, at ±pitch/2)
    for (const hx of [BW / 2 - pitch / 2, BW / 2 + pitch / 2]) {
      const hcyW = m(cy - half + wingD / 2);
      const rr = holeD / 2;
      arc90("cut", hx - rr, hcyW, hx, hcyW - rr, hx - rr, hcyW - rr);
      arc90("cut", hx, hcyW - rr, hx + rr, hcyW, hx + rr, hcyW - rr);
      arc90("cut", hx + rr, hcyW, hx, hcyW + rr, hx + rr, hcyW + rr);
      arc90("cut", hx, hcyW + rr, hx - rr, hcyW, hx - rr, hcyW + rr);
    }
  }
  // crest fold (between the corner rounds)
  line("crease", 12 + rC, cy, BW - 12 - rC, cy);

  const S = PT_PER_MM;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: BW * S, heightPt: BH * S, flapDepthPt: wingD * S, style: "cupcarrier" };
  const dims = [
    { x1: (BW / 2 - pitch / 2) * S, y1: (cy - half + wingD / 2) * S, x2: (BW / 2 + pitch / 2) * S, y2: (cy - half + wingD / 2) * S, valuePt: pitch * S, rotated: false },
    { x1: (BW + 8) * S, y1: (cy - half) * S, x2: (BW + 8) * S, y2: (cy - half + wingD) * S, valuePt: wingD * S, rotated: true },
    { x1: -12 * S, y1: (cy - half + wingD + riser) * S, x2: -12 * S, y2: cy * S, valuePt: handleH * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: BW * S, y2: BH * S + 17, valuePt: BW * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}

// Single-cup sling carrier (like the common template: handle | cup band |
// handle, e.g. 120 + 60 + 120 on a 120 mm strip). The two handle panels fold
// up at the band creases and their stadium holes align as the handle.
function buildSingleCarrier({ L, W, H, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const holeD = toMm(L);
  const BW = toMm(W);
  const handleH = toMm(H);

  const warnings = ["Standard single-cup sling construction — verify hole Ø against the cup taper."];
  if (!(holeD > 0) || !(BW > 0) || !(handleH > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  if (BW < holeD + 20) warnings.push("Strip narrower than hole Ø + 20 mm — weak webs beside the cup hole.");

  const band = holeD + 4;
  const BH = 2 * handleH + band;
  const rO = 12; // outer corner radius
  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });
  const arc90 = (layer, x1, y1, x2, y2, cxa, cya) => {
    const k = KAPPA;
    bez(layer, [x1, y1], [x1 + (cxa - x1) * k, y1 + (cya - y1) * k], [x2 + (cxa - x2) * k, y2 + (cya - y2) * k], [x2, y2]);
  };

  // rounded-rect outline
  line("cut", rO, 0, BW - rO, 0);
  arc90("cut", BW - rO, 0, BW, rO, BW, 0);
  line("cut", BW, rO, BW, BH - rO);
  arc90("cut", BW, BH - rO, BW - rO, BH, BW, BH);
  line("cut", BW - rO, BH, rO, BH);
  arc90("cut", rO, BH, 0, BH - rO, 0, BH);
  line("cut", 0, BH - rO, 0, rO);
  arc90("cut", 0, rO, rO, 0, 0, 0);

  // band creases
  line("crease", 0, handleH, BW, handleH);
  line("crease", 0, handleH + band, BW, handleH + band);

  // cup hole centred in the band
  const cyH = handleH + band / 2;
  const rr = holeD / 2;
  arc90("cut", BW / 2 - rr, cyH, BW / 2, cyH - rr, BW / 2 - rr, cyH - rr);
  arc90("cut", BW / 2, cyH - rr, BW / 2 + rr, cyH, BW / 2 + rr, cyH - rr);
  arc90("cut", BW / 2 + rr, cyH, BW / 2, cyH + rr, BW / 2 + rr, cyH + rr);
  arc90("cut", BW / 2, cyH + rr, BW / 2 - rr, cyH, BW / 2 - rr, cyH + rr);

  // stadium hand holes near each outer end (aligned when folded up)
  for (const [yc] of [[34], [BH - 34]]) {
    const hw = Math.min(70, BW - 36);
    const hh = 26;
    const r = hh / 2;
    const x1 = BW / 2 - hw / 2 + r, x2 = BW / 2 + hw / 2 - r;
    line("cut", x1, yc - r, x2, yc - r);
    line("cut", x1, yc + r, x2, yc + r);
    bez("cut", [x2, yc - r], [x2 + r * 1.1, yc - r], [x2 + r * 1.1, yc + r], [x2, yc + r]);
    bez("cut", [x1, yc - r], [x1 - r * 1.1, yc - r], [x1 - r * 1.1, yc + r], [x1, yc + r]);
  }

  const S = PT_PER_MM;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: BW * S, heightPt: BH * S, flapDepthPt: band * S, style: "cupcarrier1" };
  const dims = [
    { x1: (BW + 8) * S, y1: 0, x2: (BW + 8) * S, y2: handleH * S, valuePt: handleH * S, rotated: true },
    { x1: (BW + 8) * S, y1: handleH * S, x2: (BW + 8) * S, y2: (handleH + band) * S, valuePt: band * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: BW * S, y2: BH * S + 17, valuePt: BW * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
