// Parametric dieline (KLD) for the Aeros one-piece lock-corner cake / snack box.
//
// Geometry reverse-engineered from the reference die "SNACC Samosa Box"
// (5in L x 5in W x 3in H, blank 16.59in x 10.06in). The blank is a wrap-around
// tube  [tuck flap | lid L | side H | base L | side H]  with a band W tall;
// both open ends close with a slit-and-tab lock: the base panel throws a
// rectangular flap with a slit at H/2, the lid panel throws a curved tab whose
// barbs push through that slit, and the two side panels throw angled dust flaps.
//
// Every vertical feature of the closure scales with box height H (scale s =
// H / 3in); horizontal tab/shoulder features also scale with s and the panel
// middles stretch with L. This exactly reproduces the reference die at
// 5 x 5 x 3 and keeps the lock proportions (and clearances) correct at other
// sizes. The tuck flap is a fixed 15 mm with an 8 mm corner radius.
//
// All internal maths is in PDF points (72 pt = 1 inch). Output coordinates are
// y-down with the blank's top-left corner at (0,0).

export const PT_PER_IN = 72;
export const PT_PER_MM = 72 / 25.4;

const REF_H = 216; // reference box height, 3in in points

const TUCK_DEPTH = 42.52; // 15 mm
const TUCK_RADIUS = 22.68; // 8 mm
const KAPPA = 0.5522847498;

// Sample-derived closure constants (at s = 1, i.e. H = 3in). See file header.
const FLAP_AC = 181.98; // lid + base flap depth  (H/2 + tab)
const FLAP_BD = 176.31; // side dust-flap depth   (FLAP_AC - 2mm clearance)
const SLIT_INSET = 87.16; // slit starts this far in from each base-panel crease

export function inchesToPt(v) {
  return v * PT_PER_IN;
}
export function mmToPt(v) {
  return v * PT_PER_MM;
}

/**
 * Build the dieline. Dimensions are internal box dims of the finished box.
 * @param {object} opts
 * @param {number} opts.L length (the dimension across the locking ends)
 * @param {number} opts.W width  (the wrap-around band / tube length)
 * @param {number} opts.H height
 * @param {"in"|"mm"} [opts.units]
 * @returns {{segments: Array, blank: object, warnings: string[], valid: boolean}}
 */
export function buildCakeboxDieline({ L, W, H, units = "in" }) {
  const toPt = units === "mm" ? mmToPt : inchesToPt;
  const P = toPt(L); // lid / base panel width
  const Q = toPt(H); // side panel width
  const B = toPt(W); // band height
  const s = Q / REF_H;

  const warnings = [];
  if (!(P > 0) || !(Q > 0) || !(B > 0)) {
    return { segments: [], blank: null, warnings: ["All dimensions must be positive."], valid: false };
  }
  // The lock tab needs room between the two shoulder curves.
  const minP = 263.21 * s;
  if (P < minP) {
    warnings.push(
      `Length is too small for this height — the lock tab does not fit. ` +
        `Minimum length at this height is ${fmtDim(minP, units)} (roughly 1.25 x height).`,
    );
  }
  const rT = Math.min(TUCK_RADIUS, B / 2 - 0.5);
  if (rT < TUCK_RADIUS) warnings.push("Width is very small — tuck-flap corners were tightened to fit.");
  if (rT <= 0) {
    return { segments: [], blank: null, warnings: ["Width is too small for the tuck flap."], valid: false };
  }

  const F = FLAP_AC * s;
  const F2 = FLAP_BD * s;

  // Blank frame
  const xA = TUCK_DEPTH; // tuck | lid crease
  const xB = xA + P; //  lid | side crease
  const xC = xB + Q; // side | base crease
  const xD = xC + P; // base | side crease
  const xE = xD + Q; // right cut edge
  const yT = F; // top band crease
  const yB = F + B; // bottom band crease

  const segments = [];
  const line = (layer, x1, y1, x2, y2) => segments.push({ layer, kind: "l", pts: [[x1, y1], [x2, y2]] });
  const bez = (layer, pts) => segments.push({ layer, kind: "c", pts });

  // ---- creases (fold lines) ----
  for (const x of [xA, xB, xC, xD]) line("crease", x, yT, x, yB);
  line("crease", xA, yT, xE, yT);
  line("crease", xA, yB, xE, yB);

  // ---- tuck flap (left of lid panel, spans the band) ----
  line("cut", xA, yT, xA - (TUCK_DEPTH - rT), yT);
  arc90(bez, xA - (TUCK_DEPTH - rT), yT, xA - TUCK_DEPTH, yT + rT, "tl");
  line("cut", xA - TUCK_DEPTH, yT + rT, xA - TUCK_DEPTH, yB - rT);
  arc90(bez, xA - TUCK_DEPTH, yB - rT, xA - (TUCK_DEPTH - rT), yB, "bl");
  line("cut", xA - (TUCK_DEPTH - rT), yB, xA, yB);

  // ---- right cut edge of the band ----
  line("cut", xE, yT, xE, yB);

  // ---- end-closure flaps, top half then mirrored bottom half ----
  // Local flap coords: x rightward from the panel's left crease, y upward from
  // the band crease. `emit` maps them to page coords for either half.
  const halves = [
    { y0: yT, dir: -1 }, // top flap field (y decreases away from the band)
    { y0: yB, dir: +1 }, // bottom flap field (pure vertical mirror, as sampled)
  ];

  for (const { y0, dir } of halves) {
    const map = (x0) => ([lx, ly]) => [x0 + lx, y0 + dir * ly];

    // Lid (A) flap — curved tab with lock barbs.
    emitPath(segments, map(xA), [
      ["m", [0, 0]],
      ["c", [0.32 * s, 52.88 * s], [38.04 * s, 98.14 * s], [90 * s, 108 * s]],
      ["l", [97.42 * s, 127.37 * s]],
      ["c", [110.02 * s, 160.26 * s], [141.6 * s, 181.98 * s], [176.83 * s, 181.98 * s]],
      ["l", [P - 86.38 * s, 181.98 * s]],
      ["c", [P - 80.78 * s, 181.98 * s], [P - 75.54 * s, 179.23 * s], [P - 72.37 * s, 174.61 * s]],
      ["c", [P - 69.2 * s, 169.99 * s], [P - 68.5 * s, 164.12 * s], [P - 70.5 * s, 158.89 * s]],
      ["l", [P - 90 * s, 108 * s]],
      ["c", [P - 38.04 * s, 98.14 * s], [P - 0.33 * s, 52.88 * s], [P, 0]],
    ]);

    // Side (B) flap — straight edge toward the lid, diagonal toward the base.
    const bFlap = [
      ["m", [0, 0]],
      ["l", [0, 176.31 * s]],
      ["l", [135.47 * s, 176.31 * s]],
      ["c", [141.27 * s, 176.31 * s], [146.68 * s, 173.36 * s], [149.8 * s, 168.47 * s]],
      ["c", [152.93 * s, 163.58 * s], [153.35 * s, 157.44 * s], [150.91 * s, 152.17 * s]],
      ["l", [122.17 * s, 90 * s]],
      ["l", [108 * s, 90 * s]],
      ["l", [216 * s, 0]],
    ];
    emitPath(segments, map(xB), bFlap);

    // Side (D) flap — mirror image of B.
    emitPath(segments, (pt) => map(xD)([Q - pt[0], pt[1]]), bFlap);

    // Base (C) flap — rectangle with the lock slit at H/2.
    emitPath(segments, map(xC), [
      ["m", [0, 0]],
      ["l", [0, F]],
      ["l", [P, F]],
      ["l", [P, 0]],
    ]);
    line("cut", ...map(xC)([SLIT_INSET * s, 108 * s]), ...map(xC)([P - SLIT_INSET * s, 108 * s]));
  }

  const blank = {
    widthPt: xE,
    heightPt: B + 2 * F,
    panels: { xA, xB, xC, xD, xE, yT, yB },
    flapDepthPt: F,
    sideFlapDepthPt: F2,
    tuckDepthPt: TUCK_DEPTH,
  };

  return { segments, blank, warnings, valid: warnings.length === 0 || P >= minP };
}

// Emit a chain of ["m"|"l"|"c", ...points] into cut segments via `map`.
function emitPath(segments, map, ops) {
  let cur = null;
  for (const op of ops) {
    const kind = op[0];
    if (kind === "m") {
      cur = op[1];
      continue;
    }
    if (kind === "l") {
      segments.push({ layer: "cut", kind: "l", pts: [map(cur), map(op[1])] });
      cur = op[1];
    } else if (kind === "c") {
      segments.push({ layer: "cut", kind: "c", pts: [map(cur), map(op[1]), map(op[2]), map(op[3])] });
      cur = op[3];
    }
  }
}

// Quarter-circle as a cubic bezier between two points on the arc.
// corner: which corner of the rounded rectangle ("tl" | "bl" here).
function arc90(bez, x1, y1, x2, y2, corner) {
  const r = Math.abs(y2 - y1);
  const k = KAPPA * r;
  if (corner === "tl") {
    // going left then curving down
    bez("cut", [[x1, y1], [x1 - k, y1], [x2, y2 - k], [x2, y2]]);
  } else {
    // "bl": coming down the left edge then curving right
    bez("cut", [[x1, y1], [x1, y1 + k], [x2 - k, y2], [x2, y2]]);
  }
}

export function fmtDim(pt, units) {
  return units === "mm" ? `${(pt / PT_PER_MM).toFixed(0)} mm` : `${(pt / PT_PER_IN).toFixed(2)}"`;
}
