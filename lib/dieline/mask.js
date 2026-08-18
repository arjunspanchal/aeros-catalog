// Die-silhouette mask — turns a dieline result's CUT layer into a filled
// alpha canvas (white = board, black = cut away). Used by the 3D viewer to
// clip the simplified rectangular fold panels to the TRUE die outline —
// curved wings, notches, windows — provided the style's rig lays its flat
// pose out on the same grid as the blank.
//
// Method: raster region nesting. All cut segments are stroked (3 px, which
// also bridges die-maker nicks up to ~3 px); the non-stroke pixels are
// labelled into connected regions; regions are BFS-ranked by nesting depth
// from the outside; odd depth = board (so windows / holes at even depth stay
// open). This is robust to overlapping/duplicate segments and T-junctions,
// which break naive loop chaining on production die files.

export function buildDieMask(result, { maxSize = 1024 } = {}) {
  if (typeof document === "undefined" || !result?.valid || !result.blank) return null;
  const cuts = result.segments.filter((s) => s.layer === "cut");
  if (!cuts.length) return null;
  const W = result.blank.widthPt, H = result.blank.heightPt;
  if (!(W > 0) || !(H > 0)) return null;

  const scale = maxSize / Math.max(W, H);
  const cw = Math.max(2, Math.round(W * scale));
  const ch = Math.max(2, Math.round(H * scale));
  const M = 3; // margin so the outside is always seedable
  const w = cw + 2 * M, h = ch + 2 * M;

  // 1) stroke all cuts
  const sc = document.createElement("canvas");
  sc.width = w;
  sc.height = h;
  const g = sc.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff";
  g.lineWidth = 3;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.translate(M, M);
  g.scale(scale, scale);
  g.lineWidth = 3 / scale;
  g.beginPath();
  for (const s of cuts) {
    g.moveTo(s.pts[0][0], s.pts[0][1]);
    if (s.kind === "c") g.bezierCurveTo(s.pts[1][0], s.pts[1][1], s.pts[2][0], s.pts[2][1], s.pts[3][0], s.pts[3][1]);
    else g.lineTo(s.pts[s.pts.length - 1][0], s.pts[s.pts.length - 1][1]);
  }
  g.stroke();
  const img = g.getImageData(0, 0, w, h).data;
  const stroke = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < stroke.length; i++, j += 4) stroke[i] = img[j] > 127 ? 1 : 0;

  // 2) label non-stroke regions (4-connectivity, iterative flood)
  const region = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  let nReg = 0;
  for (let p0 = 0; p0 < w * h; p0++) {
    if (stroke[p0] || region[p0] >= 0) continue;
    let sp = 0;
    stack[sp++] = p0;
    region[p0] = nReg;
    while (sp) {
      const p = stack[--sp];
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && !stroke[p - 1] && region[p - 1] < 0) { region[p - 1] = nReg; stack[sp++] = p - 1; }
      if (x < w - 1 && !stroke[p + 1] && region[p + 1] < 0) { region[p + 1] = nReg; stack[sp++] = p + 1; }
      if (y > 0 && !stroke[p - w] && region[p - w] < 0) { region[p - w] = nReg; stack[sp++] = p - w; }
      if (y < h - 1 && !stroke[p + w] && region[p + w] < 0) { region[p + w] = nReg; stack[sp++] = p + w; }
    }
    nReg++;
  }
  if (!nReg) return null;

  // 3) region adjacency across stroke pixels (8-neighbourhood)
  const adj = Array.from({ length: nReg }, () => new Set());
  for (let p = 0; p < w * h; p++) {
    if (!stroke[p]) continue;
    const x = p % w, y = (p / w) | 0;
    let seen = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const r = region[yy * w + xx];
        if (r >= 0 && !seen.includes(r)) seen.push(r);
      }
    }
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) { adj[seen[i]].add(seen[j]); adj[seen[j]].add(seen[i]); }
  }
  // strokes are 3 px wide: regions separated by a stroke may not share a
  // single stroke pixel's 3x3 window — bridge via a 5x5 pass on stroke pixels
  for (let p = 0; p < w * h; p++) {
    if (!stroke[p]) continue;
    const x = p % w, y = (p / w) | 0;
    let seen = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const r = region[yy * w + xx];
        if (r >= 0 && !seen.includes(r)) seen.push(r);
      }
    }
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) { adj[seen[i]].add(seen[j]); adj[seen[j]].add(seen[i]); }
  }

  // 4) nesting depth by BFS from the outside region (the margin, pixel 0)
  const depth = new Int32Array(nReg).fill(-1);
  const outside = region[0] >= 0 ? region[0] : region[w * h - 1];
  if (outside < 0) return null;
  depth[outside] = 0;
  const q = [outside];
  while (q.length) {
    const r = q.shift();
    for (const n of adj[r]) if (depth[n] < 0) { depth[n] = depth[r] + 1; q.push(n); }
  }

  // 5) paint: odd depth = board; stroke pixels are board if any 8-neighbour
  // is board (so outer edges stay crisp and slits stay hairlines)
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const og = out.getContext("2d");
  const od = og.createImageData(cw, ch);
  const isBoard = (p) => { const r = region[p]; return r >= 0 && depth[r] > 0 && depth[r] % 2 === 1; };
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (y + M) * w + (x + M);
      let v = 0;
      if (stroke[p]) {
        for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1 && !v; dx++) {
          const pp = (y + M + dy) * w + (x + M + dx);
          if (pp >= 0 && pp < w * h && !stroke[pp] && isBoard(pp)) v = 1;
        }
      } else v = isBoard(p) ? 1 : 0;
      // mirrored in x: the viewer's print-side UVs are U-flipped
      const o = (y * cw + (cw - 1 - x)) * 4;
      od.data[o] = od.data[o + 1] = od.data[o + 2] = v ? 255 : 0;
      od.data[o + 3] = 255;
    }
  }
  og.putImageData(od, 0, 0);
  return out;
}
