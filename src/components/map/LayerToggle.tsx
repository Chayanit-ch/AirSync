import { useTranslation } from "../../hooks/useTranslation";

export type MapLayerMode = "pm25" | "aqi" | "heatmap";

const LAYERS: { id: MapLayerMode; key: "layerPm25" | "layerAqi" | "layerHeatmap" }[] = [
  { id: "pm25", key: "layerPm25" },
  { id: "aqi", key: "layerAqi" },
  { id: "heatmap", key: "layerHeatmap" },
];

interface LayerToggleProps {
  active: MapLayerMode;
  onChange: (mode: MapLayerMode) => void;
}

export function LayerToggle({ active, onChange }: LayerToggleProps) {
  const { t } = useTranslation();

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
          {t(`map.${layer.key}`)}
        </button>
      ))}
    </div>
  );
}
