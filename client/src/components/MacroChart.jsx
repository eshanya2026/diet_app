/**
 * Visual macro chart: donut (P/C/F) and optional bar view. Theme-aware colors.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const DEFAULT_COLORS = {
  protein: 'rgb(244, 37, 89)',
  carbs: 'rgba(244, 37, 89, 0.7)',
  fat: 'rgba(244, 37, 89, 0.4)',
};

const LABELS = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

function buildMacroData(protein, carbs, fat) {
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;
  const total = p + c + f;
  if (total <= 0) return [];
  return [
    { name: LABELS.protein, value: p, grams: p, fill: DEFAULT_COLORS.protein },
    { name: LABELS.carbs, value: c, grams: c, fill: DEFAULT_COLORS.carbs },
    { name: LABELS.fat, value: f, grams: f, fill: DEFAULT_COLORS.fat },
  ].filter((d) => d.value > 0);
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const total = payload.reduce((s, p) => s + (p.payload?.value ?? 0), 0);
  const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
  return (
    <div className="theme-card border-theme shadow-theme p-2 rounded small">
      <strong>{d.name}</strong>: {d.grams}g ({pct}%)
    </div>
  );
}

export default function MacroChart({ protein, carbs, fat, height = 220 }) {
  const data = buildMacroData(protein, carbs, fat);
  if (data.length === 0) return null;

  return (
    <div className="macro-chart">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            formatter={(value, entry) => (
              <span className="theme-text small">
                {value}: {entry.payload?.grams ?? 0}g
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
