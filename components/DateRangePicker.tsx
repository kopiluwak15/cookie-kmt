"use client";

/**
 * 共通の期間ピッカー
 *  - 開始日・終了日のカレンダー入力
 *  - プリセット: 今日 / 今週 / 今月 / 今四半期 / 直近30日
 *  - 親に { from, to } を返す
 */

const TODAY_ISO = "2026-04-08"; // TODO: new Date().toISOString().slice(0,10)

function offset(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay(); // 0=日
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

function startOfQuarter(iso: string): string {
  const m = parseInt(iso.slice(5, 7), 10);
  const qm = Math.floor((m - 1) / 3) * 3 + 1;
  return `${iso.slice(0, 4)}-${String(qm).padStart(2, "0")}-01`;
}

export type DateRange = { from: string; to: string };

export type Preset = {
  key: string;
  label: string;
  range: () => DateRange;
};

export const DEFAULT_PRESETS: Preset[] = [
  {
    key: "today",
    label: "今日",
    range: () => ({ from: TODAY_ISO, to: TODAY_ISO }),
  },
  {
    key: "week",
    label: "今週",
    range: () => ({ from: startOfWeek(TODAY_ISO), to: TODAY_ISO }),
  },
  {
    key: "month",
    label: "今月",
    range: () => ({ from: startOfMonth(TODAY_ISO), to: TODAY_ISO }),
  },
  {
    key: "quarter",
    label: "今四半期",
    range: () => ({ from: startOfQuarter(TODAY_ISO), to: TODAY_ISO }),
  },
  {
    key: "30",
    label: "直近30日",
    range: () => ({ from: offset(TODAY_ISO, -29), to: TODAY_ISO }),
  },
];

export default function DateRangePicker({
  value,
  onChange,
  activePresetKey,
  onPresetChange,
  presets = DEFAULT_PRESETS,
  compact = false,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  activePresetKey?: string | null;
  onPresetChange?: (key: string | null) => void;
  presets?: Preset[];
  compact?: boolean;
}) {
  const setFrom = (from: string) => {
    onChange({ from, to: value.to });
    onPresetChange?.(null);
  };
  const setTo = (to: string) => {
    onChange({ from: value.from, to });
    onPresetChange?.(null);
  };
  const applyPreset = (p: Preset) => {
    onChange(p.range());
    onPresetChange?.(p.key);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-brand-light/60 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => setFrom(e.target.value)}
          className="flex-1 min-w-0 bg-canvas border border-brand-light/60 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
        />
        <span className="text-ink-muted shrink-0">〜</span>
        <input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 min-w-0 bg-canvas border border-brand-light/60 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = activePresetKey === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className={`flex-1 min-w-[64px] py-2 rounded-full text-[11px] font-bold transition ${
                active
                  ? "bg-brand text-white"
                  : "bg-canvas text-ink-muted border border-brand-light/60"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
