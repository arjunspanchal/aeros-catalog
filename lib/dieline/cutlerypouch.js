// CUTLERY POUCH keyline — roll-fed flat pouch with a centre back seam,
// calibrated to the Third Wave Coffee reference (KOZO paper, surface print,
// 10x 400 mm cylinder):
//
//   10 seam | 30 half-back | 60 FRONT | 30 half-back | 10 seam  = 140 wide
//   200 tall with 10 mm top and bottom seal bands.
//
// The two half-backs fold behind the front and meet at a back centre seam;
// the 10 mm margins lap-glue together. Bottom band seals; top stays open
// (sealed after filling on some lines). Inputs: L = face width, W = pouch
// height. Half-backs = face/2; the 10 mm seams and seal bands are the
// converter's constants. Not a punched die — RED here is the trim outline,
// GREEN the fold/seal guides for artwork placement.

import { PT_PER_MM } from "./cakebox.js";

const SEAM = 10, SEAL = 10;

export function buildCutlerypouchDieline({ L, W, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const F = toMm(L);
  const Hb = toMm(W);

  const warnings = ["Roll-fed pouch keyline (not a punched die) — Third Wave/KOZO reference: half-backs = face/2 meet at the back centre seam, 10 mm lap seams and 10 mm top/bottom seal bands are the converter's constants."];
  if (!(F > 0) || !(Hb > 0)) {
    return { segments: [], blank: null, warnings: ["Face width and height must be positive."], valid: false };
  }
  if (F < 40) warnings.push("Face under 40 mm — check the cutlery actually fits with the seams.");
  if (Hb < 3 * SEAL) warnings.push("Height leaves almost nothing between the seal bands.");

  const half = F / 2;
  const BW = 2 * SEAM + 2 * half + F;
  const x1 = SEAM, x2 = SEAM + half, x3 = SEAM + half + F, x4 = BW - SEAM;

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });

  // trim outline
  line("cut", 0, 0, BW, 0);
  line("cut", BW, 0, BW, Hb);
  line("cut", BW, Hb, 0, Hb);
  line("cut", 0, Hb, 0, 0);
  // panel folds: seam | half-back | front | half-back | seam
  for (const x of [x1, x2, x3, x4]) line("crease", x, 0, x, Hb);
  // seal bands
  line("crease", 0, SEAL, BW, SEAL);
  line("crease", 0, Hb - SEAL, BW, Hb - SEAL);

  const S = PT_PER_MM;
  const segments = segs.map((s) => ({ ...s, pts: s.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: BW * S, heightPt: Hb * S, flapDepthPt: SEAL * S, style: "cutlerypouch" };
  const yMid = (Hb / 2) * S;
  const dims = [
    { x1: x2 * S, y1: yMid, x2: x3 * S, y2: yMid, valuePt: F * S, rotated: false }, // face
    { x1: x1 * S, y1: yMid + 28, x2: x2 * S, y2: yMid + 28, valuePt: half * S, rotated: false }, // half-back
    { x1: 0, y1: -15, x2: x1 * S, y2: -15, valuePt: SEAM * S, rotated: false }, // seam
    { x1: (BW + 6) * S, y1: 0, x2: (BW + 6) * S, y2: SEAL * S, valuePt: SEAL * S, rotated: true }, // seal band
    { x1: 0, y1: Hb * S + 17, x2: BW * S, y2: Hb * S + 17, valuePt: BW * S, rotated: false }, // blank W
  ];
  return { segments, blank, dims, warnings, valid: true, meta: { seam: SEAM, seal: SEAL, half } };
}
