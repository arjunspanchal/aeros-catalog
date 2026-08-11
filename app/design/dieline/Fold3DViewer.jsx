"use client";

// Dependency-free 3D fold + MOCKUP viewer.
// - Orbit (drag), zoom (wheel), fold slider (t: 0 flat -> 1 formed).
// - Artwork mockup: the rig's FLAT pose (t = 0) is the print layout, so an
//   uploaded artwork image is UV-mapped to the flat pose once and travels
//   with every panel as the box folds — works for every rigged style with
//   no per-style mapping. Outside faces carry the print; inside faces stay
//   unprinted board. Textured quads are drawn as subdivided affine
//   triangles (classic canvas technique).
// - Backdrop presets, soft contact shadow, HD PNG export & WebM turntable
//   via the imperative handle.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { poseRig } from "@/lib/dieline/fold3d";

const BACKDROPS = {
  studio: ["#f4f4f5", "#d4d4d8"],
  white: ["#ffffff", "#f1f1f1"],
  warm: ["#f5efe6", "#e2d5bf"],
  dark: ["#3f3f46", "#18181b"],
};

const SURFACES = {
  white: { out: [244, 243, 240], inn: [250, 249, 246] },
  kraft: { out: [214, 189, 150], inn: [235, 222, 196] },
  duplex: { out: [235, 233, 228], inn: [176, 168, 152] },
  art: { out: [248, 247, 244], inn: [250, 249, 246] },
  corrugated: { out: [205, 176, 133], inn: [222, 200, 164] },
};

const Fold3DViewer = forwardRef(function Fold3DViewer(
  { panels, foldT, artwork = null, backdrop = "studio", surface = "kraft" },
  apiRef,
) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ yaw: 0.7, pitch: 1.0, zoom: 1, dragging: false, lx: 0, ly: 0 });

  // core scene renderer, reusable for screen + export
  const renderScene = (ctx, cw, chh, opts = {}) => {
    const st = { ...stateRef.current, ...opts.camera };
    const t = opts.foldT ?? foldT;
    const [g0, g1] = BACKDROPS[backdrop] || BACKDROPS.studio;
    const grad = ctx.createLinearGradient(0, 0, 0, chh);
    grad.addColorStop(0, g0);
    grad.addColorStop(1, g1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, chh);

    const faces = poseRig(panels, t);
    const flat = poseRig(panels, 0); // print layout (UV source)
    // artwork space: bbox of the flat pose
    let fminX = 1e9, fmaxX = -1e9, fminY = 1e9, fmaxY = -1e9;
    for (const f of flat) for (const [x, y] of f.pts3) {
      fminX = Math.min(fminX, x); fmaxX = Math.max(fmaxX, x);
      fminY = Math.min(fminY, y); fmaxY = Math.max(fmaxY, y);
    }
    const fw = fmaxX - fminX || 1, fh = fmaxY - fminY || 1;

    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
    for (const f of faces) for (const [x, y, z] of f.pts3) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    const c = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const dist = (radius * 2.1) / st.zoom;

    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
    const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const toCam = ([x, y, z]) => {
      const dx = x - c[0], dy = y - c[1], dz = z - c[2];
      const x1 = dx * cy - dy * sy, y1 = dx * sy + dy * cy, z1 = dz;
      const y2 = y1 * sp + z1 * cp;
      const z2 = -y1 * cp + z1 * sp;
      return [x1, y2, z2 + dist];
    };
    const f = Math.min(cw, chh) * 1.35;
    const proj = ([x, y, z]) => [cw / 2 + (f * x) / z, chh / 2 - (f * y) / z, z];

    // soft contact shadow (ellipse under the model on the backdrop)
    const groundY = proj(toCam([c[0], c[1], minZ]))[1];
    ctx.save();
    ctx.filter = "blur(10px)";
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cw / 2, Math.min(groundY + 14, chh - 12), cw * 0.24 * st.zoom, 14 * st.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const light = norm3([0.35, -0.5, -0.8]);
    const sur = SURFACES[surface] || SURFACES.kraft;
    // rotate a world vector into camera space (rotation only)
    const rotCam = ([x, y, z]) => {
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy, z1 = z;
      return [x1, y1 * sp + z1 * cp, -y1 * cp + z1 * sp];
    };
    const rendered = faces.map((face, i) => {
      const cam = face.pts3.map(toCam);
      const scr = cam.map(proj);
      // world normal of the panel = its local +Z (the fold-toward / interior side)
      const nw = norm3(cross(sub(face.pts3[1], face.pts3[0]), sub(face.pts3[3], face.pts3[0])));
      const nCam = rotCam(nw);
      // camera sees the PRINT (local -Z, exterior) side when +Z points away
      const exterior = nCam[2] > 0;
      const nn = exterior ? nCam.map((v) => -v) : nCam;
      const shade = 0.6 + 0.4 * Math.max(0, -(nn[0] * light[0] + nn[1] * light[1] + nn[2] * light[2]));
      const depth = cam.reduce((s, p) => s + p[2], 0) / cam.length;
      return { scr, depth, shade, facing: exterior ? 1 : -1, i };
    });
    rendered.sort((a, b) => b.depth - a.depth);

    for (const r of rendered) {
      const tone = faces[r.i].tone || 0;
      const base = r.facing === 1 ? sur.out : sur.inn;
      const col = base.map((v) => Math.round(v * (1 - tone * 0.2) * r.shade));
      // face base fill
      ctx.beginPath();
      ctx.moveTo(r.scr[0][0], r.scr[0][1]);
      for (let k = 1; k < r.scr.length; k++) ctx.lineTo(r.scr[k][0], r.scr[k][1]);
      ctx.closePath();
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fill();
      // artwork on OUTSIDE faces: flat-pose region -> projected quad
      if (artwork && r.facing === 1) {
        const src = flat[r.i].pts3.map(([x, y]) => [
          ((x - fminX) / fw) * artwork.width,
          (1 - (y - fminY) / fh) * artwork.height, // flat +y is "up the blank"
        ]);
        drawTexturedQuad(ctx, artwork, src, r.scr, 3);
        // shading multiply over the artwork
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(r.scr[0][0], r.scr[0][1]);
        for (let k = 1; k < r.scr.length; k++) ctx.lineTo(r.scr[k][0], r.scr[k][1]);
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = 1 - r.shade;
        ctx.fillStyle = "rgb(30,25,18)";
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.moveTo(r.scr[0][0], r.scr[0][1]);
      for (let k = 1; k < r.scr.length; k++) ctx.lineTo(r.scr[k][0], r.scr[k][1]);
      ctx.closePath();
      ctx.strokeStyle = artwork ? "rgba(60,50,35,0.25)" : "rgba(90,70,45,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !panels) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth, chh = canvas.clientHeight;
    if (canvas.width !== cw * dpr) { canvas.width = cw * dpr; canvas.height = chh * dpr; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderScene(ctx, cw, chh);
  };

  useImperativeHandle(apiRef, () => ({
    exportPng(size = 2048) {
      const off = document.createElement("canvas");
      off.width = size;
      off.height = Math.round(size * 0.75);
      renderScene(off.getContext("2d"), off.width, off.height);
      return new Promise((res) => off.toBlob(res, "image/png"));
    },
    async exportTurntable(seconds = 3) {
      const off = document.createElement("canvas");
      off.width = 1280;
      off.height = 960;
      const octx = off.getContext("2d");
      const stream = off.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((res) => (rec.onstop = res));
      rec.start();
      const frames = seconds * 30;
      const startYaw = stateRef.current.yaw;
      for (let i = 0; i <= frames; i++) {
        renderScene(octx, off.width, off.height, { camera: { yaw: startYaw + (i / frames) * Math.PI * 2 } });
        await new Promise((r) => setTimeout(r, 1000 / 30));
      }
      rec.stop();
      await done;
      return new Blob(chunks, { type: "video/webm" });
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !panels) return;
    draw();
    const st = stateRef.current;
    const down = (e) => { st.dragging = true; st.lx = e.clientX; st.ly = e.clientY; };
    const move = (e) => {
      if (!st.dragging) return;
      st.yaw += (e.clientX - st.lx) * 0.01;
      st.pitch = Math.max(0.12, Math.min(1.45, st.pitch + (e.clientY - st.ly) * 0.01));
      st.lx = e.clientX; st.ly = e.clientY;
      draw();
    };
    const up = () => { st.dragging = false; };
    const wheel = (e) => {
      e.preventDefault();
      st.zoom = Math.max(0.4, Math.min(3, st.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      draw();
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      canvas.removeEventListener("wheel", wheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, foldT, artwork, backdrop, surface]);

  return (
    <canvas
      ref={canvasRef}
      className="h-[440px] w-full cursor-grab touch-none rounded-md active:cursor-grabbing"
    />
  );
});

export default Fold3DViewer;

// draw image quad src(4 pts, image space) -> dest(4 pts, screen) via an
// n x n grid of affine-mapped triangles
function drawTexturedQuad(ctx, img, src, dst, n = 3) {
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const bilerp = (q, u, v) => lerp2(lerp2(q[0], q[1], u), lerp2(q[3], q[2], u), v);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
      const s = [bilerp(src, u0, v0), bilerp(src, u1, v0), bilerp(src, u1, v1), bilerp(src, u0, v1)];
      const d = [bilerp(dst, u0, v0), bilerp(dst, u1, v0), bilerp(dst, u1, v1), bilerp(dst, u0, v1)];
      drawTexturedTriangle(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
      drawTexturedTriangle(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
    }
  }
}

function drawTexturedTriangle(ctx, img, s, d) {
  const [[sx0, sy0], [sx1, sy1], [sx2, sy2]] = s;
  const [[dx0, dy0], [dx1, dy1], [dx2, dy2]] = d;
  const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
  if (Math.abs(denom) < 1e-6) return;
  const a = (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom;
  const b = (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom;
  const cc = (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom;
  const dd = (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom;
  const e = dx0 - a * sx0 - b * sy0;
  const ff = dy0 - cc * sx0 - dd * sy0;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(dx0, dy0);
  ctx.lineTo(dx1, dy1);
  ctx.lineTo(dx2, dy2);
  ctx.closePath();
  // expand clip slightly to hide seams
  ctx.clip();
  ctx.transform(a, cc, b, dd, e, ff);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
