"use client";

// Parametric dieline generator UI. Each box style is a geometry engine in
// lib/dieline/ (verified against a real Aeros/reference die); exporters are
// style-agnostic. Everything runs client-side.

import { useMemo, useState } from "react";
import { buildCakeboxDieline } from "@/lib/dieline/cakebox";
import { buildFoodboxDieline } from "@/lib/dieline/foodbox";
import { buildBurgerboxDieline } from "@/lib/dieline/burgerbox";
import { buildPaperbagKeyline, BAG_TYPES } from "@/lib/dieline/paperbag";
import { buildTuckboxDieline } from "@/lib/dieline/tuckbox";
import { toSvg, toPdf, toDxf, fmtBoth } from "@/lib/dieline/exports";
import { MATERIALS, materialStamp, materialThicknessMm } from "@/lib/dieline/materials";

const inputCls =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

const STYLES = {
  cakebox: {
    label: "Cake / Snack Box",
    build: buildCakeboxDieline,
    defaultUnits: "in",
    defaults: { L: "5", W: "5", H: "3" },
    hints: { L: "across the lock ends", W: "wrap-around band", H: "box depth" },
    // presets are stored in their native unit and converted on click
    presets: [
      { label: 'Samosa 5 x 5 x 3"', dims: [5, 5, 3], unit: "in" },
      { label: 'Cake 7 x 7 x 4"', dims: [7, 7, 4], unit: "in" },
      { label: 'Cake 8 x 8 x 5"', dims: [8, 8, 5], unit: "in" },
      { label: 'Cake 10 x 10 x 5"', dims: [10, 10, 5], unit: "in" },
      { label: 'Cake 12 x 12 x 5"', dims: [12, 12, 5], unit: "in" },
    ],
    depthLabel: "End-flap depth",
    note:
      "One-piece lock-corner die, no glue — tuck flap closes the wrap, base-flap slit locks the lid tab on both ends. Feed the blank size straight into the box calculator for sheet nesting.",
  },
  foodbox: {
    label: "Food Box (leakproof)",
    build: buildFoodboxDieline,
    defaultUnits: "mm",
    defaults: { L: "144", W: "104", H: "40" },
    hints: { L: "top opening length", W: "top opening width", H: "wall height" },
    presets: [
      { label: "500 mL (144×104×40)", dims: [144, 104, 40], unit: "mm", taper: 7 },
      { label: "750 mL (164×114×45)", dims: [164, 114, 45], unit: "mm", taper: 7 },
      { label: "1000 mL (200×139×50, taper 10)", dims: [200, 139, 50], unit: "mm", taper: 10 },
    ],
    hasTaper: true,
    depthLabel: "Wall height",
    note:
      "Tapered leakproof tray (7 mm flare per side — base comes out 14 mm smaller each way) with corner gussets, hinged lid with V-notches, and an 18 mm lip whose slots catch the wall teeth. Dims are the internal top opening.",
  },
  tuckbox: {
    label: "Mailer / Tuck Box (0427)",
    build: buildTuckboxDieline,
    defaultUnits: "mm",
    defaults: { L: "315", W: "202", H: "62" },
    hints: { L: "internal length", W: "internal width", H: "internal height" },
    presets: [
      { label: "315×202×62", dims: [315, 202, 62], unit: "mm" },
      { label: "250×180×80", dims: [250, 180, 80], unit: "mm" },
      { label: "200×150×50", dims: [200, 150, 50], unit: "mm" },
    ],
    usesThickness: true,
    depthLabel: "Wall height",
    note:
      "Roll-end tuck-top mailer (FEFCO 0427): rolled double side walls, lid with dust flaps, rounded tuck. Thickness allowances come from the selected board caliper. Standard construction — prototype the first die.",
  },
  paperbag: {
    label: "Paper Bag (keyline)",
    build: buildPaperbagKeyline,
    defaultUnits: "mm",
    defaults: { L: "230", W: "125", H: "335" },
    fieldLabels: ["Width (W)", "Gusset (G)", "Height (H)"],
    hints: { L: "bag face width", W: "side gusset", H: "bag height" },
    presets: [
      { label: "105×65×165", dims: [105, 65, 165], unit: "mm" },
      { label: "127×73×271", dims: [127, 73, 271], unit: "mm" },
      { label: "230×125×335", dims: [230, 125, 335], unit: "mm" },
      { label: "254×152×406", dims: [254, 152, 406], unit: "mm" },
      { label: "305×229×432", dims: [305, 229, 432], unit: "mm" },
    ],
    hasBagType: true,
    depthLabel: "Bottom fold",
    note:
      "Flat blank for print/artwork — seam | front | gusset | back | gusset, SOS diamond folds at the gusset centres. Blank maths matches the bag rate calculator exactly (seam 15/20/25 by width, bottom = 0.75×G, V-bottom +15).",
  },
  burgerbox: {
    label: "Burger Box (clamshell)",
    build: buildBurgerboxDieline,
    defaultUnits: "mm",
    defaults: { L: "102", W: "102", H: "39" },
    hints: { L: "base depth (front-back)", W: "base width (hinge side)", H: "wall height" },
    presets: [{ label: "Standard 102×102×39", dims: [102, 102, 39], unit: "mm" }],
    depthLabel: "Wall height",
    note:
      "Hinged clamshell — base tray with flared walls and rounded side wings, double-crease spine, lid with front tuck lock. Organic curves are band-scaled from the production 204 × 381 mm blank, so the standard size is die-exact and other sizes are drafts for the die maker.",
  },
};

export default function DielineClient() {
  const [styleId, setStyleId] = useState("cakebox");
  const style = STYLES[styleId];
  const [units, setUnits] = useState(style.defaultUnits);
  const [L, setL] = useState(style.defaults.L);
  const [W, setW] = useState(style.defaults.W);
  const [H, setH] = useState(style.defaults.H);
  const [taper, setTaper] = useState("7");
  const [showDims, setShowDims] = useState(true);
  const [matFamily, setMatFamily] = useState("white");
  const [matIdx, setMatIdx] = useState(3); // 280 gsm FBB default
  const [matCustomMm, setMatCustomMm] = useState("");
  const [bagType, setBagType] = useState("sos");
  const [hem, setHem] = useState("");

  const dims = { L: parseFloat(L), W: parseFloat(W), H: parseFloat(H) };
  const ready = [dims.L, dims.W, dims.H].every((v) => Number.isFinite(v) && v > 0);

  const matLabel = materialStamp(matFamily, matIdx, matCustomMm);
  const boardMm = materialThicknessMm(matFamily, matIdx, matCustomMm);
  const taperMm = style.hasTaper ? parseFloat(taper) || 7 : undefined;
  const result = useMemo(
    () => (ready ? style.build({ ...dims, taper: taperMm, bagType, hem: hem === "" ? undefined : +hem, thickness: boardMm, units }) : null),
    [styleId, dims.L, dims.W, dims.H, taperMm, bagType, hem, boardMm, units, ready],
  );

  const title = `${style.label} KLD ${L} x ${W} x ${H} ${units} - ${matLabel}`;
  const svg = useMemo(
    () => (result && result.blank ? toSvg(result, { units, showDims, title }) : null),
    [result, units, showDims, title],
  );

  function switchStyle(id) {
    if (id === styleId) return;
    const s = STYLES[id];
    setStyleId(id);
    setUnits(s.defaultUnits);
    setL(s.defaults.L);
    setW(s.defaults.W);
    setH(s.defaults.H);
    setTaper("7");
    setBagType("sos");
    setHem("");
  }

  function switchUnits(next) {
    if (next === units) return;
    const conv = (v) => {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return v;
      return next === "mm" ? String(Math.round(n * 25.4)) : String(+(n / 25.4).toFixed(2));
    };
    setL(conv(L));
    setW(conv(W));
    setH(conv(H));
    setUnits(next);
  }

  function applyPreset(p) {
    const conv = (v) => {
      if (p.unit === units) return String(v);
      return units === "mm" ? String(Math.round(v * 25.4)) : String(+(v / 25.4).toFixed(2));
    };
    setL(conv(p.dims[0]));
    setW(conv(p.dims[1]));
    setH(conv(p.dims[2]));
    if (p.taper != null) setTaper(String(p.taper));
  }

  function download(ext) {
    if (!result || !result.blank) return;
    const base = `aeros-${styleId}-${L}x${W}x${H}${units}-KLD`;
    let blob;
    if (ext === "svg") {
      blob = new Blob([toSvg(result, { units, showDims, title })], { type: "image/svg+xml" });
    } else if (ext === "pdf") {
      blob = new Blob([toPdf(result, { units, showDims, title })], { type: "application/pdf" });
    } else {
      blob = new Blob([toDxf(result)], { type: "application/dxf" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const blank = result?.blank;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Controls */}
      <div className="space-y-5">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Box style</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STYLES).map(([id, s]) => (
              <button
                key={id}
                onClick={() => switchStyle(id)}
                className={
                  id === styleId
                    ? "rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900"
                    : "rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-300"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Internal box size</h2>
            <div className="flex overflow-hidden rounded-md border border-gray-300 text-xs dark:border-gray-700">
              {["in", "mm"].map((u) => (
                <button
                  key={u}
                  onClick={() => switchUnits(u)}
                  className={
                    u === units
                      ? "bg-gray-900 px-3 py-1 font-semibold text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-white px-3 py-1 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300"
                  }
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              [(style.fieldLabels || ["Length", "Width", "Height"])[0], L, setL, style.hints.L],
              [(style.fieldLabels || ["Length", "Width", "Height"])[1], W, setW, style.hints.W],
              [(style.fieldLabels || ["Length", "Width", "Height"])[2], H, setH, style.hints.H],
            ].map(([label, val, set, hint]) => (
              <label key={label} className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {label} ({units})
                </span>
                <input
                  type="number"
                  min="0"
                  step={units === "mm" ? "1" : "0.25"}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className={inputCls}
                />
                <span className="mt-0.5 block text-[10px] leading-tight text-gray-400">{hint}</span>
              </label>
            ))}
          </div>

          {style.hasBagType && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Bag type</span>
                <select value={bagType} onChange={(e) => setBagType(e.target.value)} className={inputCls}>
                  {BAG_TYPES.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Top hem (mm)</span>
                <input
                  type="number"
                  min="0"
                  placeholder={bagType === "handle" ? "auto 35" : "0"}
                  value={hem}
                  onChange={(e) => setHem(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
          )}
          {style.hasTaper && (
            <label className="mt-3 block">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Wall taper (mm per side)</span>
              <input
                type="number"
                min="3"
                step="0.5"
                value={taper}
                onChange={(e) => setTaper(e.target.value)}
                className={inputCls + " max-w-[120px]"}
              />
              <span className="mt-0.5 block text-[10px] leading-tight text-gray-400">
                base = top − 2×taper each way · 7 on the 500/750 mL dies, 10 on the 1000 mL
              </span>
            </label>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {style.presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-gray-900 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-300 dark:hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Material</h2>
          <div className="grid grid-cols-1 gap-2">
            <select
              value={matFamily}
              onChange={(e) => { setMatFamily(e.target.value); setMatIdx(0); setMatCustomMm(""); }}
              className={inputCls}
            >
              {MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <select value={matIdx} onChange={(e) => setMatIdx(+e.target.value)} className={inputCls}>
              {(MATERIALS.find((m) => m.id === matFamily)?.options || []).map((o, i) => (
                <option key={o.label} value={i}>{o.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.05"
              placeholder="Custom thickness mm (optional)"
              value={matCustomMm}
              onChange={(e) => setMatCustomMm(e.target.value)}
              className={inputCls}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            Stamped on every export and used for the outer-size estimate below. Dims stay INTERNAL —
            thickness allowances on folds remain the die maker's call.
          </p>
        </section>

        {blank && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Blank (sheet) size</h2>
            <dl className="space-y-1 text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <dt>Blank width</dt>
                <dd className="font-mono">{fmtBoth(blank.widthPt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Blank height</dt>
                <dd className="font-mono">{fmtBoth(blank.heightPt)}</dd>
              </div>
              {blank.flapDepthPt != null && (
                <div className="flex justify-between">
                  <dt>{style.depthLabel}</dt>
                  <dd className="font-mono">{fmtBoth(blank.flapDepthPt)}</dd>
                </div>
              )}
              {boardMm > 0 && ready && (
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <dt>Outer size (approx, +board)</dt>
                  <dd className="font-mono">
                    {outerDim(dims.L, boardMm, units)} × {outerDim(dims.W, boardMm, units)} × {outerDimH(dims.H, boardMm, units)} {units}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{style.note}</p>
          </section>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Download</h2>
          <div className="grid grid-cols-3 gap-2">
            {["pdf", "svg", "dxf"].map((ext) => (
              <button
                key={ext}
                onClick={() => download(ext)}
                disabled={!blank}
                className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-gray-700 disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                {ext}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={showDims} onChange={(e) => setShowDims(e.target.checked)} />
            Include dimension annotations (PDF / SVG)
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            PDF and SVG are true-scale vectors. DXF is in mm with CUT / CREASE layers for the
            die maker. Red = cut, green = crease.
          </p>
        </section>
      </div>

      {/* Preview */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {result?.warnings?.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {result.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}
        {svg ? (
          <div
            className="dieline-preview w-full overflow-auto rounded-md bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <p className="py-16 text-center text-sm text-gray-400">Enter a valid size to preview the die.</p>
        )}
      </div>
    </div>
  );
}

function outerDim(v, boardMm, units) {
  const t = units === "mm" ? boardMm : boardMm / 25.4;
  return +(v + 2 * t).toFixed(units === "mm" ? 1 : 3);
}
function outerDimH(v, boardMm, units) {
  const t = units === "mm" ? boardMm : boardMm / 25.4;
  return +(v + t).toFixed(units === "mm" ? 1 : 3);
}
