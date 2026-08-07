// MAILER / TUCK BOX (FEFCO 0427) dieline — calibrated to a professional
// die-maker's size family (6x6x2, 6x4x2, 6x2x2 in; L=152.4 and H=50.8 shared,
// W varies). All three blanks are embedded (tuck-ref.js, cut/crease separated
// by the die maker) and the engine band-scales from the NEAREST-W reference:
//   x: [side assembly | base panel (L) | side assembly]   sides follow H
//   y: [tuck | lid (W) | back | base (W) | front]         tuck/back/front follow H
// Output is die-exact at the three reference sizes; between them the interior
// details (slit spacing, dust-flap proportions) come from the closest
// hand-tuned original, which is how the die maker themselves stepped sizes.
// Die-maker details preserved: thumb-notch tuck, double/triple roll creases,
// corner ears, base lock slits. Drawn for corrugated (E/B flute).

import { PT_PER_MM } from "./cakebox.js";
import { TUCK_REFS, TUCK_XB } from "./tuck-ref.js";

const REF_L = TUCK_XB[2] - TUCK_XB[1]; // 152.4
const REF_H = 50.8;

export function buildTuckboxDieline({ L, W, H, units = "mm" }) {
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Lm = toMm(L);
  const Wm = toMm(W);
  const Hm = toMm(H);

  const warnings = [];
  if (!(Lm > 0) || !(Wm > 0) || !(Hm > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  if (Wm < 40) warnings.push("Depth under 40 mm — below the proven die family range.");
  if (Hm < 25 || Hm > 120) warnings.push("Height outside the proven range for this die family — review before cutting.");

  // nearest-W reference
  const ref = Object.values(TUCK_REFS).sort((a, b) => Math.abs(a.W - Wm) - Math.abs(b.W - Wm))[0];
  const yb = ref.yb;

  const fL = Lm / REF_L;
  const fW = Wm / ref.W;
  const fH = Hm / REF_H;
  const xScales = [fH, fL, fH];
  const yScales = [fH, fW, fH, fW, fH];
  const mapAxis = (v, bands, scales) => {
    let out = 0;
    for (let i = 0; i < scales.length; i++) {
      const b0 = bands[i], b1 = bands[i + 1];
      if (v >= b1) out += (b1 - b0) * scales[i];
      else { out += Math.max(0, v - b0) * scales[i]; return out; }
    }
    return out;
  };
  const mapX = (x) => mapAxis(Math.max(x, 0), TUCK_XB, xScales) * PT_PER_MM;
  const mapY = (y) => mapAxis(Math.max(y, 0), yb, yScales) * PT_PER_MM;

  const segments = [];
  for (const tag of ["cut", "crease"]) {
    for (const s of ref.segs[tag]) {
      segments.push({ layer: tag, kind: s[0], pts: s.slice(1).map(([x, y]) => [mapX(x), mapY(y)]) });
    }
  }

  const widthPt = mapX(TUCK_XB[3]);
  const heightPt = mapY(yb[5]);
  const blank = { widthPt, heightPt, flapDepthPt: Hm * PT_PER_MM, style: "tuckbox" };
  const dims = [
    { x1: mapX(TUCK_XB[1]), y1: mapY(yb[3]) + (Wm / 2) * PT_PER_MM, x2: mapX(TUCK_XB[2]), y2: mapY(yb[3]) + (Wm / 2) * PT_PER_MM, valuePt: Lm * PT_PER_MM, rotated: false },
    { x1: mapX(TUCK_XB[3]) + 17, y1: mapY(yb[3]), x2: mapX(TUCK_XB[3]) + 17, y2: mapY(yb[4]), valuePt: Wm * PT_PER_MM, rotated: true },
    { x1: mapX(TUCK_XB[0]) - 15, y1: mapY(yb[2]), x2: mapX(TUCK_XB[0]) - 15, y2: mapY(yb[3]), valuePt: Hm * PT_PER_MM, rotated: true },
    { x1: 0, y1: heightPt + 17, x2: widthPt, y2: heightPt + 17, valuePt: widthPt, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
