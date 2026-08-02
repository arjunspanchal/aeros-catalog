"use client";

// Dependency-free 3D fold viewer: orbit with pointer drag, zoom with wheel,
// fold the box with the slider (t: 0 = flat blank, 1 = formed). Flat-shaded
// painter's-algorithm canvas renderer — plenty for panel meshes.

import { useEffect, useRef } from "react";
import { poseRig } from "@/lib/dieline/fold3d";

export default function Fold3DViewer({ panels, foldT }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ yaw: -0.6, pitch: -1.0, zoom: 1, dragging: false, lx: 0, ly: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !panels) return;

    const draw = () => {
      const st = stateRef.current;
      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.clientWidth, chh = canvas.clientHeight;
      if (canvas.width !== cw * dpr) { canvas.width = cw * dpr; canvas.height = chh * dpr; }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, chh);

      const faces = poseRig(panels, foldT);
      // bounds for framing
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
      for (const f of faces) for (const [x, y, z] of f.pts3) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      const c = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
      const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
      const dist = radius * 2.1 / st.zoom;

      const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
      const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      const toCam = ([x, y, z]) => {
        let dx = x - c[0], dy = y - c[1], dz = z - c[2];
        let x1 = dx * cy - dy * sy, y1 = dx * sy + dy * cy, z1 = dz; // yaw about Z
        let y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp; // pitch about X
        return [x1, y2, z2 + dist];
      };
      const f = Math.min(cw, chh) * 1.35;
      const proj = ([x, y, z]) => [cw / 2 + (f * x) / z, chh / 2 + (f * y) / z, z];

      const light = norm3([0.35, -0.5, -0.8]);
      const rendered = faces.map((face) => {
        const cam = face.pts3.map(toCam);
        const scr = cam.map(proj);
        const n = norm3(cross(sub(cam[1], cam[0]), sub(cam[3], cam[0])));
        const facing = n[2] < 0 ? 1 : -1; // flip normal toward camera
        const nn = facing === 1 ? n : n.map((v) => -v);
        const shade = 0.55 + 0.45 * Math.max(0, -(nn[0] * light[0] + nn[1] * light[1] + nn[2] * light[2]));
        const depth = cam.reduce((s, p) => s + p[2], 0) / cam.length;
        // kraft outside, lighter inside
        const base = facing === 1 ? [214, 189, 150] : [235, 222, 196];
        const t = face.tone || 0;
        const col = base.map((v) => Math.round(v * (1 - t * 0.25) * shade));
        return { scr, depth, col };
      });
      rendered.sort((a, b) => b.depth - a.depth);
      for (const r of rendered) {
        ctx.beginPath();
        ctx.moveTo(r.scr[0][0], r.scr[0][1]);
        for (let i = 1; i < r.scr.length; i++) ctx.lineTo(r.scr[i][0], r.scr[i][1]);
        ctx.closePath();
        ctx.fillStyle = `rgb(${r.col[0]},${r.col[1]},${r.col[2]})`;
        ctx.strokeStyle = "rgba(90,70,45,0.55)";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      }
    };

    draw();
    const st = stateRef.current;
    const down = (e) => { st.dragging = true; st.lx = e.clientX; st.ly = e.clientY; };
    const move = (e) => {
      if (!st.dragging) return;
      st.yaw += (e.clientX - st.lx) * 0.01;
      st.pitch = Math.max(-2.8, Math.min(-0.15, st.pitch + (e.clientY - st.ly) * 0.01));
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
  }, [panels, foldT]);

  return (
    <canvas
      ref={canvasRef}
      className="h-[440px] w-full cursor-grab touch-none rounded-md bg-gradient-to-b from-gray-50 to-gray-200 active:cursor-grabbing dark:from-gray-800 dark:to-gray-900"
    />
  );
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
