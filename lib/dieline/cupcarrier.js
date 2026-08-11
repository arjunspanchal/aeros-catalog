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
  const web = 22;
  const BW = 2 * pitch;
  if (BW < holeD + 2 * web) warnings.push("Blank too narrow for the hole diameter.");

  const wingD = holeD + 2 * web; // wing depth (cup holes)
  const riser = Math.max(28, holeD * 0.42); // clearance band between wing and handle
  const half = wingD + riser + handleH;
  const BH = 2 * half;
  const rO = 16; // outer corner radius

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });
  const arc90 = (layer, x1, y1, x2, y2, cxa, cya) => {
    const k = KAPPA;
    bez(layer, [x1, y1], [x1 + (cxa - x1) * k, y1 + (cya - y1) * k], [x2 + (cxa - x2) * k, y2 + (cya - y2) * k], [x2, y2]);
  };

  // ---- outline: one rounded-rect strip ----
  line("cut", rO, 0, BW - rO, 0);
  arc90("cut", BW - rO, 0, BW, rO, BW, 0);
  line("cut", BW, rO, BW, BH - rO);
  arc90("cut", BW, BH - rO, BW - rO, BH, BW, BH);
  line("cut", BW - rO, BH, rO, BH);
  arc90("cut", rO, BH, 0, BH - rO, 0, BH);
  line("cut", 0, BH - rO, 0, rO);
  arc90("cut", 0, rO, rO, 0, 0, 0);

  // ---- folds (full width): wing|riser, riser|handle, crest, mirrored ----
  for (const y of [wingD, wingD + riser, half, BH - wingD - riser, BH - wingD]) {
    line("crease", 0, y, BW, y);
  }

  // ---- features per half ----
  const circle = (hx, hy, rr) => {
    arc90("cut", hx - rr, hy, hx, hy - rr, hx - rr, hy - rr);
    arc90("cut", hx, hy - rr, hx + rr, hy, hx + rr, hy - rr);
    arc90("cut", hx + rr, hy, hx, hy + rr, hx + rr, hy + rr);
    arc90("cut", hx, hy + rr, hx - rr, hy, hx - rr, hy + rr);
  };
  const stadium = (yc) => {
    const hw = Math.min(78, BW - 60);
    const hh = 26;
    const r = hh / 2;
    const x1 = BW / 2 - hw / 2 + r, x2 = BW / 2 + hw / 2 - r;
    line("cut", x1, yc - r, x2, yc - r);
    line("cut", x1, yc + r, x2, yc + r);
    bez("cut", [x2, yc - r], [x2 + r * 1.1, yc - r], [x2 + r * 1.1, yc + r], [x2, yc + r]);
    bez("cut", [x1, yc - r], [x1 - r * 1.1, yc - r], [x1 - r * 1.1, yc + r], [x1, yc + r]);
  };
  // cup holes centred in each wing
  for (const wy of [wingD / 2, BH - wingD / 2]) {
    circle(BW / 2 - pitch / 2, wy, holeD / 2);
    circle(BW / 2 + pitch / 2, wy, holeD / 2);
  }
  // hand holes: same offset from the crest in each handle panel so they align
  stadium(half - handleH / 2);
  stadium(half + handleH / 2);

  const S = PT_PER_MM;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: BW * S, heightPt: BH * S, flapDepthPt: wingD * S, style: "cupcarrier" };
  const dims = [
    { x1: (BW / 2 - pitch / 2) * S, y1: (wingD / 2) * S, x2: (BW / 2 + pitch / 2) * S, y2: (wingD / 2) * S, valuePt: pitch * S, rotated: false },
    { x1: (BW + 8) * S, y1: 0, x2: (BW + 8) * S, y2: wingD * S, valuePt: wingD * S, rotated: true },
    { x1: (BW + 8) * S, y1: (wingD + riser) * S, x2: (BW + 8) * S, y2: half * S, valuePt: handleH * S, rotated: true },
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
