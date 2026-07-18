export type MapLayerMode = "pm25" | "aqi" | "heatmap";

const LAYERS: { id: MapLayerMode; label: string }[] = [
  { id: "pm25", label: "ค่าฝุ่น PM2.5" },
  { id: "aqi", label: "ดัชนี AQI" },
  { id: "heatmap", label: "ความร้อน" },
];

interface LayerToggleProps {
  active: MapLayerMode;
  onChange: (mode: MapLayerMode) => void;
}

export function LayerToggle({ active, onChange }: LayerToggleProps) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {LAYERS.map((layer) => (
        <button
          key={layer.id}
          type="button"
          onClick={() => onChange(layer.id)}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold shadow-md transition-colors ${
            active === layer.id
              ? "bg-brand-600 text-white"
              : "bg-white text-gray-600"
          }`}
        >
          {layer.label}
        </button>
      ))}
    </div>
  );
}
