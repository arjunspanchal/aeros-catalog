"use client";

const ITEM_COLORS = [
  { fill: "#3b82f6", stroke: "#1d4ed8", text: "#ffffff" }, // blue
  { fill: "#10b981", stroke: "#047857", text: "#ffffff" }, // emerald
  { fill: "#f59e0b", stroke: "#b45309", text: "#ffffff" }, // amber
  { fill: "#ef4444", stroke: "#b91c1c", text: "#ffffff" }, // red
  { fill: "#8b5cf6", stroke: "#6d28d9", text: "#ffffff" }, // violet
  { fill: "#ec4899", stroke: "#be185d", text: "#ffffff" }, // pink
  { fill: "#14b8a6", stroke: "#0f766e", text: "#ffffff" }, // teal
];

const colorFor = (idx) => ITEM_COLORS[idx % ITEM_COLORS.length];

// Top-down view of the container floor with pallet rectangles.
export function PalletDiagram({ container, items, placements, palletGrid }) {
  if (!placements || !palletGrid) return null;
  const PAD = 10;
  const MAX_W = 720;
  const scale = (MAX_W - PAD * 2) / container.L;
  const innerW = container.L * scale;
  const innerH = container.W * scale;
  const W = innerW + PAD * 2;
  const H = innerH + PAD * 2 + 40; // room for door label

  const placed = placements.filter((p) => !p.overflow);
  const overflow = placements.filter((p) => p.overflow);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Container floor — top-down stuffing diagram">
        {/* Container outline */}
        <rect
          x={PAD}
          y={PAD}
          width={innerW}
          height={innerH}
          fill="#f9fafb"
          stroke="#9ca3af"
          strokeWidth="1.5"
          className="dark:fill-gray-800"
        />
        {/* Door indicator on the right */}
        <line
          x1={PAD + innerW}
          y1={PAD + innerH * 0.15}
          x2={PAD + innerW}
          y2={PAD + innerH * 0.85}
          stroke="#dc2626"
          strokeWidth="3"
        />
        <text x={PAD + innerW - 4} y={PAD + innerH + 14} textAnchor="end" fontSize="10" fill="#6b7280">
          door
        </text>
        <text x={PAD} y={PAD + innerH + 14} fontSize="10" fill="#6b7280">
          {container.L} mm
        </text>
        <text x={PAD - 4} y={PAD + innerH / 2} textAnchor="end" fontSize="10" fill="#6b7280" transform={`rotate(-90 ${PAD - 4} ${PAD + innerH / 2})`}>
          {container.W} mm
        </text>
        {/* Pallets */}
        {placed.map((p, i) => {
          const c = colorFor(p.itemIdx);
          const x = PAD + p.x * scale;
          const y = PAD + p.y * scale;
          const w = p.w * scale;
          const h = p.h * scale;
          return (
            <g key={i}>
              <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} fill={c.fill} stroke={c.stroke} strokeWidth="0.8" />
              <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize="9" fill={c.text} fontWeight="600">
                {p.itemIdx + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {items.map((it, i) => {
          const c = colorFor(i);
          const need = it.palletInfo?.palletsNeeded || 0;
          if (need === 0) return null;
          return (
            <div key={i} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c.fill, border: `1px solid ${c.stroke}` }} />
              <span className="text-gray-700 dark:text-gray-300">
                {i + 1}. {it.name || `Item ${i + 1}`} · {need} pallet{need !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
      {overflow.length > 0 && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {overflow.length} pallet{overflow.length !== 1 ? "s" : ""} don&apos;t fit on the floor — overflow.
        </p>
      )}
    </div>
  );
}

// Floor mode: top-down view of one floor layer of the dominant item, plus
// per-item utilization bar. We don't show every carton position for multi-item
// since real loaders don't pack like that; for the diagram we draw the largest
// item's first-layer footprint.
export function FloorDiagram({ container, items }) {
  // Pick the first item with valid dims and qty>0 for the layer view.
  const focus = items.find((it) => it.qty > 0 && it.L > 0) || items[0];
  if (!focus) return null;

  // Best L/W orientation on the floor (just for visualization — pick the one with most cartons).
  const tryOrient = (cL, cW) => ({
    cL,
    cW,
    nL: Math.floor(container.L / cL),
    nW: Math.floor(container.W / cW),
  });
  const a = tryOrient(focus.L, focus.W);
  const b = tryOrient(focus.W, focus.L);
  const o = a.nL * a.nW >= b.nL * b.nW ? a : b;
  if (o.nL === 0 || o.nW === 0) return null;

  const PAD = 10;
  const MAX_W = 720;
  const scale = (MAX_W - PAD * 2) / container.L;
  const innerW = container.L * scale;
  const innerH = container.W * scale;
  const W = innerW + PAD * 2;
  const H = innerH + PAD * 2 + 40;
  const c = colorFor(items.indexOf(focus));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Container floor — first layer top-down">
        <rect x={PAD} y={PAD} width={innerW} height={innerH} fill="#f9fafb" stroke="#9ca3af" strokeWidth="1.5" className="dark:fill-gray-800" />
        <line x1={PAD + innerW} y1={PAD + innerH * 0.15} x2={PAD + innerW} y2={PAD + innerH * 0.85} stroke="#dc2626" strokeWidth="3" />
        <text x={PAD + innerW - 4} y={PAD + innerH + 14} textAnchor="end" fontSize="10" fill="#6b7280">door</text>
        <text x={PAD} y={PAD + innerH + 14} fontSize="10" fill="#6b7280">{container.L} mm</text>
        {Array.from({ length: o.nL * o.nW }).map((_, i) => {
          const col = i % o.nL;
          const row = Math.floor(i / o.nL);
          const x = PAD + col * o.cL * scale;
          const y = PAD + row * o.cW * scale;
          const w = o.cL * scale;
          const h = o.cW * scale;
          return (
            <rect
              key={i}
              x={x + 0.3}
              y={y + 0.3}
              width={w - 0.6}
              height={h - 0.6}
              fill={c.fill}
              fillOpacity="0.85"
              stroke={c.stroke}
              strokeWidth="0.4"
            />
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        First-layer footprint of {focus.name || "selected item"}: {o.nL} × {o.nW} = {o.nL * o.nW} cartons per layer.
        Floor view only — vertical stacking and mixed-SKU placement are loader-judged.
      </p>
    </div>
  );
}
