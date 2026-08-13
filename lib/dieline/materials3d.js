// 3D mockup materials — Pacdora-style surface presets for the WebGL viewer.
// All textures are generated procedurally on canvas (no assets, no network):
// paper fibre noise for kraft grades, fluting stripes for the corrugated
// interior. Browser-only; textures are cached per surface id.

export const SURFACES_3D = [
  { id: "white", label: "White Board", swatch: "#f2f1ee" },
  { id: "kraft", label: "Brown Kraft", swatch: "#c9a76c" },
  { id: "kraftwhite", label: "White Kraft", swatch: "#e9e2d0" },
  { id: "duplex", label: "Duplex", swatch: "linear-gradient(135deg,#efede8 50%,#aaa295 50%)" },
  { id: "corrugated", label: "Corrugated", swatch: "repeating-linear-gradient(90deg,#c8a878 0 3px,#b6935f 3px 6px)" },
  { id: "gloss", label: "Glossy Coated", swatch: "linear-gradient(135deg,#ffffff 30%,#dcdcdc 55%,#f6f6f6 75%)" },
];

function noiseCanvas({ base, fibre, fibreAlpha = 0.05, strokes = 1400, speckle = 900, speckleAlpha = 0.05 }) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  // fibre strokes: thin, near-horizontal, wrapping
  g.strokeStyle = fibre;
  g.lineWidth = 1;
  for (let i = 0; i < strokes; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const len = 8 + Math.random() * 40;
    const ang = (Math.random() - 0.5) * 0.5;
    g.globalAlpha = fibreAlpha * (0.4 + Math.random() * 0.6);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
  // speckle
  for (let i = 0; i < speckle; i++) {
    g.globalAlpha = speckleAlpha * Math.random();
    g.fillStyle = Math.random() < 0.5 ? "#000" : "#fff";
    g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  g.globalAlpha = 1;
  return c;
}

function flutingCanvas({ liner, shadow, period = 18 }) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = liner;
  g.fillRect(0, 0, 512, 512);
  // vertical sinusoidal shading = flute ridges seen through the inner liner
  for (let x = 0; x < 512; x++) {
    const s = Math.sin((x / period) * Math.PI * 2);
    g.globalAlpha = 0.16 * Math.max(0, s) + 0.1 * Math.max(0, -s) * 0.4;
    g.fillStyle = shadow;
    g.fillRect(x, 0, 1, 512);
  }
  g.globalAlpha = 1;
  return c;
}

// ext/inn: { color (hex int, tints the map), canvas (texture source | null),
// rough, bump (bumpScale | 0) } — artworkTint replaces ext.color when artwork
// is draped so prints on kraft keep the warm base.
const DEFS = {
  white: {
    ext: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#f2f1ee", fibre: "#c9c5bc", fibreAlpha: 0.035 }), rough: 0.78, bump: 0.25 },
    inn: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#faf9f6", fibre: "#d8d4cb", fibreAlpha: 0.03 }), rough: 0.9, bump: 0.15 },
    artworkTint: 0xffffff,
  },
  kraft: {
    ext: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#c29c66", fibre: "#8a6a3c", fibreAlpha: 0.09, strokes: 2000 }), rough: 0.95, bump: 0.5 },
    inn: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#d9bd92", fibre: "#a5844f", fibreAlpha: 0.07 }), rough: 0.95, bump: 0.3 },
    artworkTint: 0xe3cda4, // print multiplies with the kraft base
  },
  kraftwhite: {
    ext: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#eae3d1", fibre: "#bfb394", fibreAlpha: 0.07, strokes: 1800 }), rough: 0.9, bump: 0.4 },
    inn: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#f0ead9", fibre: "#c9bd9e", fibreAlpha: 0.05 }), rough: 0.92, bump: 0.25 },
    artworkTint: 0xf3ecdb,
  },
  duplex: {
    ext: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#efede8", fibre: "#cfccc4", fibreAlpha: 0.03 }), rough: 0.7, bump: 0.2 },
    inn: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#aaa295", fibre: "#7e776b", fibreAlpha: 0.08, strokes: 1600 }), rough: 0.95, bump: 0.3 },
    artworkTint: 0xffffff,
  },
  corrugated: {
    ext: { color: 0xffffff, canvas: () => noiseCanvas({ base: "#c8a878", fibre: "#93744a", fibreAlpha: 0.08, strokes: 1800 }), rough: 0.95, bump: 0.45 },
    inn: { color: 0xffffff, canvas: () => flutingCanvas({ liner: "#d3b483", shadow: "#7d5f38" }), rough: 0.95, bump: 0.6 },
    artworkTint: 0xe6cda2,
  },
  gloss: {
    ext: { color: 0xffffff, canvas: null, rough: 0.22, bump: 0 },
    inn: { color: 0xfaf9f6, canvas: () => noiseCanvas({ base: "#faf9f6", fibre: "#d8d4cb", fibreAlpha: 0.03 }), rough: 0.9, bump: 0.15 },
    artworkTint: 0xffffff,
  },
};

export function getSurfaceDef(id) {
  return DEFS[id] || DEFS.kraft;
}
