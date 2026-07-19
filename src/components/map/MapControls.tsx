import { Layers, Locate, Minus, Plus } from "lucide-react";
import { useMap } from "react-leaflet";
import { useTranslation } from "../../hooks/useTranslation";

interface MapControlsProps {
  onToggleLayers: () => void;
}

export function MapControls({ onToggleLayers }: MapControlsProps) {
  const map = useMap();
  const { t } = useTranslation();

  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 15 });
  };

  return (
    <div className="absolute top-3 right-3 z-500 flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggleLayers}
        aria-label={t("map.layersLabel")}
        className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 shadow-md active:bg-gray-50"
      >
        <Layers size={18} />
      </button>
      <button
        type="button"
        onClick={handleLocate}
        aria-label={t("map.myLocationLabel")}
        className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 shadow-md active:bg-gray-50"
      >
        <Locate size={18} />
      </button>
      <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label={t("map.zoomInLabel")}
          className="border-b border-gray-100 p-2.5 text-gray-600 active:bg-gray-50"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label={t("map.zoomOutLabel")}
          className="p-2.5 text-gray-600 active:bg-gray-50"
        >
          <Minus size={18} />
        </button>
      </div>
    </div>
  );
}
