// Die-silhouette mask — turns a dieline result's CUT layer into a filled
// alpha canvas (white = board, black = cut away). Used by the 3D viewer to
// clip the simplified rectangular fold panels to the TRUE die outline —
// curved wings, notches, finger holes — provided the style's rig lays its
// flat pose out on the same grid as the blank.
//
// The cut layer is an unordered soup of line/bezier segments; they are
// chained end-to-end into closed loops (outer outline + holes) and filled
// with the evenodd rule. Returns null when the outline doesn't close —
// callers should treat that as "no mask" and render unclipped.

const TOL = 1.5; // pt — endpoint matching tolerance when chaining

export function buildDieMask(result, { maxSize = 1024 } = {}) {
  if (typeof document === "undefined" || !result?.valid || !result.blank) return null;
  const cuts = result.segments.filter((s) => s.layer === "cut");
  if (!cuts.length) return null;

  // chain segments into loops by greedy endpoint matching
  const segs = cuts.map((s) => ({ kind: s.kind, pts: s.pts, used: false }));
  const near = (a, b) => Math.abs(a[0] - b[0]) < TOL && Math.abs(a[1] - b[1]) < TOL;
  const loops = [];
  for (const start of segs) {
    if (start.used) continue;
    start.used = true;
    const loop = [{ kind: start.kind, pts: start.pts }];
    let head = start.pts[start.pts.length - 1];
    const first = start.pts[0];
    let closed = false;
    for (let guard = 0; guard < segs.length + 1; guard++) {
      if (near(head, first)) { closed = true; break; }
      let advanced = false;
      for (const s of segs) {
        if (s.used) continue;
        const a = s.pts[0], b = s.pts[s.pts.length - 1];
        if (near(head, a)) {
          s.used = true;
          loop.push({ kind: s.kind, pts: s.pts });
          head = b;
          advanced = true;
          break;
        }
        if (near(head, b)) {
          s.used = true;
          loop.push({ kind: s.kind, pts: [...s.pts].reverse() });
          head = a;
          advanced = true;
          break;
        }
      }
      if (!advanced) break;
    }
    if (!closed) return null; // open outline — bail, render unclipped
    loops.push(loop);
  }

  const W = result.blank.widthPt, H = result.blank.heightPt;
  if (!(W > 0) || !(H > 0)) return null;
  const scale = maxSize / Math.max(W, H);
  const cw = Math.max(2, Math.round(W * scale));
  const ch = Math.max(2, Math.round(H * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, cw, ch);
  // the viewer's UVs mirror U (print side is viewed from local -Z), so the
  // mask is drawn mirrored to sample correctly through the shared UV channel
  g.translate(cw, 0);
  g.scale(-scale, scale);
  const path = new Path2D();
  for (const loop of loops) {
    path.moveTo(loop[0].pts[0][0], loop[0].pts[0][1]);
    for (const s of loop) {
      if (s.kind === "c") path.bezierCurveTo(s.pts[1][0], s.pts[1][1], s.pts[2][0], s.pts[2][1], s.pts[3][0], s.pts[3][1]);
      else path.lineTo(s.pts[s.pts.length - 1][0], s.pts[s.pts.length - 1][1]);
    }
    path.closePath();
  }
  g.fillStyle = "#fff";
  g.fill(path, "evenodd");
  return canvas;
}
