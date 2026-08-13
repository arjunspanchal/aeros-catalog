"use client";

// WebGL fold + MOCKUP viewer (three.js) — Pacdora-class presentation.
// - Real lighting (hemisphere + shadowed key light), soft contact shadow,
//   damped orbit with inertia, wheel zoom.
// - Artwork mockup: the rig's FLAT pose (t = 0) is the print layout; every
//   panel's UVs are its flat-pose rectangle, so one uploaded image drapes
//   the whole box and folds with it. Print side = panel local -Z (exterior);
//   the inside stays unprinted board.
// - Styles that physically fold flat on the ground (bags, cartons, sleeves)
//   are stood upright as the fold completes.
// - HD PNG export + WebM/MP4 turntable via the imperative handle.
//
// ORBIT DIRECTIONS ARE LOCKED (approved 11-Aug-2026): the box follows the
// cursor on BOTH axes — drag right pulls the near face right, drag down
// rolls the top face toward you. pitch = true elevation. Do NOT flip.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { poseRig } from "@/lib/dieline/fold3d";

const BACKDROPS = {
  studio: ["#f4f4f5", "#d4d4d8"],
  white: ["#ffffff", "#f1f1f1"],
  warm: ["#f5efe6", "#e2d5bf"],
  dark: ["#3f3f46", "#18181b"],
};

const SURFACES = {
  white: { out: 0xf4f3f0, inn: 0xfaf9f6 },
  kraft: { out: 0xd6bd96, inn: 0xebdec4 },
  duplex: { out: 0xebe9e4, inn: 0xb0a898 },
  art: { out: 0xf8f7f4, inn: 0xfaf9f6 },
  corrugated: { out: 0xcdb085, inn: 0xdec8a4 },
};

// formed pose lies flat on the ground for these — stand them up as t -> 1
const UPRIGHT_STYLES = new Set(["carton", "sleeve", "paperbag", "dcutbag"]);
const ease = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));

const Fold3DViewer = forwardRef(function Fold3DViewer(
  { panels, foldT, artwork = null, backdrop = "studio", surface = "kraft", styleId = "" },
  apiRef,
) {
  const hostRef = useRef(null);
  const stateRef = useRef({
    yaw: 0.7, pitch: 0.55, zoom: 1,
    dragging: false, lx: 0, ly: 0, vyaw: 0, vpitch: 0,
  });
  const threeRef = useRef(null); // { renderer, scene, camera, group, meshes, ... }
  const propsRef = useRef({ panels, foldT, artwork, surface, styleId });
  propsRef.current = { panels, foldT, artwork, surface, styleId };

  // ---------- scene setup (once) ----------
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, host.clientWidth / host.clientHeight, 1, 50000);
    camera.up.set(0, 0, 1); // rig world is Z-up

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0aca4, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    // ground: shadow-only plane at z = 0
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    ground.receiveShadow = true;
    scene.add(ground);

    threeRef.current = { renderer, scene, camera, group, ground, key, fill, meshes: [], texture: null, texKey: null, raf: 0 };

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      if (w && h) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(host);

    // ---------- render loop (damped orbit) ----------
    const st = stateRef.current;
    const tick = () => {
      threeRef.current.raf = requestAnimationFrame(tick);
      if (!st.dragging) {
        st.yaw += st.vyaw;
        st.pitch = Math.max(-1.45, Math.min(1.45, st.pitch + st.vpitch));
        st.vyaw *= 0.92;
        st.vpitch *= 0.92;
      }
      renderFrame();
    };
    tick();

    // ---------- input (LOCKED directions — see header) ----------
    const el = renderer.domElement;
    const down = (e) => { st.dragging = true; st.lx = e.clientX; st.ly = e.clientY; st.vyaw = 0; st.vpitch = 0; el.style.cursor = "grabbing"; };
    const move = (e) => {
      if (!st.dragging) return;
      const dx = (e.clientX - st.lx) * 0.008, dy = (e.clientY - st.ly) * 0.008;
      st.yaw += dx;
      st.pitch = Math.max(-1.45, Math.min(1.45, st.pitch + dy));
      st.vyaw = dx; st.vpitch = dy;
      st.lx = e.clientX; st.ly = e.clientY;
    };
    const up = () => { st.dragging = false; el.style.cursor = "grab"; };
    const wheel = (e) => {
      e.preventDefault();
      st.zoom = Math.max(0.4, Math.min(3, st.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    el.addEventListener("wheel", wheel, { passive: false });

    return () => {
      cancelAnimationFrame(threeRef.current.raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      el.removeEventListener("wheel", wheel);
      disposeMeshes();
      threeRef.current.texture?.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
      threeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function disposeMeshes() {
    const t = threeRef.current;
    if (!t) return;
    for (const m of t.meshes) {
      t.group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    t.meshes = [];
  }

  // ---------- build / update panel meshes ----------
  function syncScene() {
    const t = threeRef.current;
    const { panels: rig, foldT: ft, artwork: art, surface: surf, styleId: sid } = propsRef.current;
    if (!t || !rig) return;

    // artwork texture (recreate only when the image object changes)
    if (art !== t.texKey) {
      t.texture?.dispose();
      t.texture = null;
      t.texKey = art;
      if (art) {
        const tex = new THREE.Texture(art);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = t.renderer.capabilities.getMaxAnisotropy();
        tex.needsUpdate = true;
        t.texture = tex;
      }
      disposeMeshes(); // materials change with artwork
    }

    const faces = poseRig(rig, ft);
    const flat = poseRig(rig, 0);
    let fminX = 1e9, fmaxX = -1e9, fminY = 1e9, fmaxY = -1e9;
    for (const f of flat) for (const [x, y] of f.pts3) {
      fminX = Math.min(fminX, x); fmaxX = Math.max(fmaxX, x);
      fminY = Math.min(fminY, y); fmaxY = Math.max(fmaxY, y);
    }
    const fw = fmaxX - fminX || 1, fh = fmaxY - fminY || 1;
    const sur = SURFACES[surf] || SURFACES.kraft;

    // (re)build meshes if the rig shape changed
    if (t.meshes.length !== faces.length * 2) {
      disposeMeshes();
      for (let i = 0; i < faces.length; i++) {
        // exterior (print side, local -Z): draw the quad with reversed
        // winding so its front face looks along -Z
        const gExt = new THREE.BufferGeometry();
        gExt.setIndex([0, 2, 1, 0, 3, 2]);
        gExt.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
        // print side is viewed from local -Z, where rig +x runs screen-left —
        // mirror U so the artwork (authored print-side, like the dieline)
        // reads correctly and lands on the right panels
        const u = flat[i].pts3.map(([x, y]) => [1 - (x - fminX) / fw, (y - fminY) / fh]);
        gExt.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(u.flat()), 2));
        const mExt = new THREE.MeshStandardMaterial({
          color: t.texture ? 0xffffff : sur.out,
          map: t.texture || null,
          roughness: 0.88,
          metalness: 0,
        });
        const ext = new THREE.Mesh(gExt, mExt);
        ext.castShadow = true;
        ext.receiveShadow = true;

        // interior (unprinted board, local +Z)
        const gInn = new THREE.BufferGeometry();
        gInn.setIndex([0, 1, 2, 0, 2, 3]);
        gInn.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
        const tone = 1 - (faces[i].tone || 0) * 0.18;
        const cInn = new THREE.Color(sur.inn).multiplyScalar(tone);
        const inn = new THREE.Mesh(gInn, new THREE.MeshStandardMaterial({ color: cInn, roughness: 0.95, metalness: 0 }));
        inn.castShadow = true;
        inn.receiveShadow = true;

        t.group.add(ext, inn);
        t.meshes.push(ext, inn);
      }
    }

    // update vertex positions for the current fold state
    for (let i = 0; i < faces.length; i++) {
      const pts = faces[i].pts3;
      for (const k of [0, 1]) {
        const mesh = t.meshes[i * 2 + k];
        const pos = mesh.geometry.getAttribute("position");
        for (let j = 0; j < 4; j++) pos.setXYZ(j, pts[j][0], pts[j][1], pts[j][2]);
        pos.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingSphere();
      }
    }

    // upright presentation for styles that fold lying down
    const upright = UPRIGHT_STYLES.has(sid) ? ease((ft - 0.55) / 0.45) : 0;
    t.group.rotation.x = (upright * Math.PI) / 2;

    // sit the model on the ground (z = 0)
    t.group.position.set(0, 0, 0);
    t.group.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(t.group);
    if (Number.isFinite(bb.min.z)) t.group.position.z = -bb.min.z;
    t.bbox = new THREE.Box3().setFromObject(t.group);
  }

  function renderFrame() {
    const t = threeRef.current;
    if (!t || !t.bbox) return;
    const st = stateRef.current;
    const c = t.bbox.getCenter(new THREE.Vector3());
    const size = t.bbox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) || 1;
    const dist = radius * (1.05 + 2.1 / st.zoom);

    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
    const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    t.camera.position.set(c.x - dist * cp * sy, c.y - dist * cp * cy, c.z + dist * sp);
    t.camera.lookAt(c);

    t.key.position.set(c.x + radius * 1.5, c.y - radius * 2, c.z + radius * 3);
    t.key.target.position.copy(c);
    t.key.target.updateMatrixWorld();
    const s = t.key.shadow.camera;
    s.left = -radius * 1.6; s.right = radius * 1.6; s.top = radius * 1.6; s.bottom = -radius * 1.6;
    s.near = radius * 0.2; s.far = radius * 8;
    s.updateProjectionMatrix();
    t.fill.position.set(c.x - radius * 2, c.y + radius, c.z + radius);

    t.ground.scale.set(radius * 30, radius * 30, 1);
    t.ground.position.set(c.x, c.y, 0);

    t.renderer.render(t.scene, t.camera);
  }

  // rebuild scene contents when inputs change
  useEffect(() => {
    syncScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, foldT, artwork, surface, styleId]);

  useImperativeHandle(apiRef, () => ({
    async exportPng(size = 2048) {
      const t = threeRef.current;
      if (!t || !propsRef.current.panels) return null;
      const host = hostRef.current;
      const w0 = host.clientWidth, h0 = host.clientHeight;
      t.renderer.setSize(size, Math.round(size * 0.75), false);
      t.camera.aspect = size / Math.round(size * 0.75);
      t.camera.updateProjectionMatrix();
      renderFrame();
      const blob = await new Promise((res) => t.renderer.domElement.toBlob(res, "image/png"));
      t.renderer.setSize(w0, h0, false);
      t.camera.aspect = w0 / h0;
      t.camera.updateProjectionMatrix();
      return blob;
    },
    async exportTurntable(seconds = 3) {
      const t = threeRef.current;
      if (!t || !propsRef.current.panels || typeof MediaRecorder === "undefined") return null;
      const canvas = t.renderer.domElement;
      if (!canvas.captureStream) return null;
      const mime = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find(
        (m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m),
      );
      if (!mime) return null;
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((res) => (rec.onstop = res));
      const st = stateRef.current;
      const startYaw = st.yaw;
      rec.start();
      const frames = seconds * 30;
      for (let i = 0; i <= frames; i++) {
        st.yaw = startYaw + (i / frames) * Math.PI * 2;
        renderFrame();
        await new Promise((r) => setTimeout(r, 1000 / 30));
      }
      st.yaw = startYaw;
      rec.stop();
      await done;
      return new Blob(chunks, { type: mime.split(";")[0] });
    },
  }));

  const [g0, g1] = BACKDROPS[backdrop] || BACKDROPS.studio;
  return (
    <div
      ref={hostRef}
      className="h-[440px] w-full overflow-hidden rounded-md"
      style={{ background: `linear-gradient(${g0}, ${g1})` }}
    />
  );
});

export default Fold3DViewer;
