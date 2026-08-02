// ENVELOPE dieline — pocket envelope: body W x H, side flaps glued behind the
// back, bottom flap, curved top closure flap. Standard construction.

import { PT_PER_MM } from "./cakebox.js";

export function buildEnvelopeDieline({ L, W, units = "mm" }) {
  // L = envelope width, W = envelope height (H input unused)
  const toMm = units === "in" ? (v) => v * 25.4 : (v) => v;
  const Wm = toMm(L);
  const Hm = toMm(W);

  const warnings = ["Standard pocket envelope — prototype the first cut."];
  if (!(Wm > 0) || !(Hm > 0)) {
    return { segments: [], blank: null, warnings: ["Width and height must be positive."], valid: false };
  }
  const sf = Math.min(25, Wm * 0.18); // side flap depth
  const bf = Math.min(Hm * 0.75, Hm - 12); // bottom flap depth
  const tf = Math.max(25, Hm * 0.35); // top closure flap depth

  const cx = sf + Wm / 2;
  const y0 = tf; // body top
  const y1 = y0 + Hm; // body bottom
  const BH = y1 + bf;

  const segs = [];
  const line = (layer, xa, ya, xb, yb) => segs.push({ layer, kind: "l", pts: [[xa, ya], [xb, yb]] });
  const bez = (layer, p0, p1, p2, p3) => segs.push({ layer, kind: "c", pts: [p0, p1, p2, p3] });

  // body creases
  line("crease", sf, y0, sf + Wm, y0);
  line("crease", sf, y1, sf + Wm, y1);
  line("crease", sf, y0, sf, y1);
  line("crease", sf + Wm, y0, sf + Wm, y1);

  // side flaps (tapered)
  for (const [xw, xdir] of [[sf, -1], [sf + Wm, +1]]) {
    line("cut", xw, y0, xw + xdir * sf, y0 + 6);
    line("cut", xw + xdir * sf, y0 + 6, xw + xdir * sf, y1 - 6);
    line("cut", xw + xdir * sf, y1 - 6, xw, y1);
  }

  // bottom flap (tapered, rounded outer corners)
  line("cut", sf, y1, sf + 6, y1 + bf - 4);
  bez("cut", [sf + 6, y1 + bf - 4], [sf + 6.5, y1 + bf - 1], [sf + 9, y1 + bf], [sf + 12, y1 + bf]);
  line("cut", sf + 12, y1 + bf, sf + Wm - 12, y1 + bf);
  bez("cut", [sf + Wm - 12, y1 + bf], [sf + Wm - 9, y1 + bf], [sf + Wm - 6.5, y1 + bf - 1], [sf + Wm - 6, y1 + bf - 4]);
  line("cut", sf + Wm - 6, y1 + bf - 4, sf + Wm, y1);

  // top closure flap — gentle curve to a rounded point
  bez("cut", [sf, y0], [sf + Wm * 0.12, y0 - tf * 0.9], [cx - Wm * 0.15, y0 - tf], [cx, y0 - tf]);
  bez("cut", [cx, y0 - tf], [cx + Wm * 0.15, y0 - tf], [sf + Wm - Wm * 0.12, y0 - tf * 0.9], [sf + Wm, y0]);

  const S = PT_PER_MM;
  const BW = Wm + 2 * sf;
  const segments = segs.map((sg) => ({ ...sg, pts: sg.pts.map(([x, y]) => [x * S, y * S]) }));
  const blank = { widthPt: BW * S, heightPt: BH * S, flapDepthPt: tf * S, style: "envelope" };
  const dims = [
    { x1: sf * S, y1: (y0 + Hm / 2) * S, x2: (sf + Wm) * S, y2: (y0 + Hm / 2) * S, valuePt: Wm * S, rotated: false },
    { x1: (BW + 6) * S, y1: y0 * S, x2: (BW + 6) * S, y2: y1 * S, valuePt: Hm * S, rotated: true },
    { x1: 0, y1: BH * S + 17, x2: BW * S, y2: BH * S + 17, valuePt: BW * S, rotated: false },
  ];
  return { segments, blank, dims, warnings, valid: true };
}
