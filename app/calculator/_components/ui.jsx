// Shared UI primitives used across the calculator + admin pages.

export const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
export const labelCls = "block text-xs font-medium text-gray-500 mb-1";

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Card({ title, children, className = "", right }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="text-sm font-semibold text-gray-700">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Row({ label, value, highlight, sub }) {
  return (
    <tr className={highlight ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}>
      <td className="py-2 px-3 text-sm border-b border-gray-100">
        <span className={highlight ? "text-blue-700" : "text-gray-600"}>{label}</span>
        {sub && <span className="block text-xs text-gray-400 font-normal">{sub}</span>}
      </td>
      <td className={`py-2 px-3 text-sm text-right border-b border-gray-100 ${highlight ? "text-blue-700" : "text-gray-800"}`}>
        {value}
      </td>
    </tr>
  );
}

export function SectionHeader({ label }) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={2} className="py-1.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </td>
    </tr>
  );
}

export function Toggle({ value, onChange, label, sub }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-blue-600" : "bg-gray-300"}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </label>
  );
}

export function PillBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

export function Header({ title, subtitle, right }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
