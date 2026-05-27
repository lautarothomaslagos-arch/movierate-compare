// RadarChart en SVG puro (sin libs externas). Soporta hasta 4 datasets
// overlapeados con colores distintos. Cada eje va de 0 a maxValue.
// Si un value es null, se interpola como 0 en ese eje.

type Axis = {
  key: string;
  label: string;
};

type Dataset = {
  name: string;
  color: string; // tailwind text-* + hex para fill
  hex: string; // hex literal para fill/stroke en SVG
  values: Record<string, number | null>;
};

export function RadarChart({
  axes,
  datasets,
  maxValue = 10,
  size = 360,
}: {
  axes: Axis[];
  datasets: Dataset[];
  maxValue?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38; // deja espacio para labels
  const n = axes.length;

  // Posición de cada vértice del eje i (0 = arriba, en sentido horario)
  function axisPoint(i: number, fraction: number): { x: number; y: number } {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius * fraction,
      y: cy + Math.sin(angle) * radius * fraction,
    };
  }

  // Posición del label fuera del eje (1.15x radio)
  function labelPoint(i: number): {
    x: number;
    y: number;
    anchor: "start" | "middle" | "end";
  } {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius * 1.18;
    const y = cy + Math.sin(angle) * radius * 1.18;
    let anchor: "start" | "middle" | "end" = "middle";
    if (Math.abs(Math.cos(angle)) > 0.5) {
      anchor = Math.cos(angle) > 0 ? "start" : "end";
    }
    return { x, y, anchor };
  }

  // Construye el polígono para un dataset
  function datasetPolygon(ds: Dataset): string {
    return axes
      .map((axis, i) => {
        const v = ds.values[axis.key];
        const fraction = v !== null && v !== undefined ? v / maxValue : 0;
        const { x, y } = axisPoint(i, Math.max(0, Math.min(1, fraction)));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  // Anillos de referencia (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full h-auto"
        role="img"
        aria-label="Radar chart de ratings"
      >
        {/* Anillos de fondo */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={axes
              .map((_, i) => {
                const { x, y } = axisPoint(i, r);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={r === 1 ? 0.35 : 0.15}
            strokeWidth={1}
            className="text-muted-foreground"
          />
        ))}

        {/* Ejes radiales (líneas del centro a cada vértice) */}
        {axes.map((_, i) => {
          const { x, y } = axisPoint(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
              className="text-muted-foreground"
            />
          );
        })}

        {/* Polígonos de cada dataset (orden inverso para que el primero quede arriba visualmente al hacer overlay translúcido) */}
        {datasets.map((ds) => (
          <polygon
            key={ds.name}
            points={datasetPolygon(ds)}
            fill={ds.hex}
            fillOpacity={0.18}
            stroke={ds.hex}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}

        {/* Puntos en cada vértice del polígono de cada dataset */}
        {datasets.map((ds) =>
          axes.map((axis, i) => {
            const v = ds.values[axis.key];
            if (v === null || v === undefined) return null;
            const fraction = Math.max(0, Math.min(1, v / maxValue));
            const { x, y } = axisPoint(i, fraction);
            return (
              <circle
                key={`${ds.name}-${axis.key}`}
                cx={x}
                cy={y}
                r={3}
                fill={ds.hex}
              />
            );
          })
        )}

        {/* Labels de ejes */}
        {axes.map((axis, i) => {
          const lp = labelPoint(i);
          return (
            <text
              key={axis.key}
              x={lp.x}
              y={lp.y}
              textAnchor={lp.anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill="currentColor"
              className="text-foreground font-medium"
            >
              {axis.label}
            </text>
          );
        })}
      </svg>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {datasets.map((ds) => (
          <div
            key={ds.name}
            className="inline-flex items-center gap-1.5 text-xs"
          >
            <span
              className="inline-block size-3 rounded-sm ring-1 ring-border/40"
              style={{ backgroundColor: ds.hex }}
              aria-hidden
            />
            <span className="truncate max-w-[160px]">{ds.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
