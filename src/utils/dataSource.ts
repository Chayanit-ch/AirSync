import type { DataSource } from "../types";

/**
 * Visual identity for each data source, shared by the map markers, the
 * legend, and the debug station counter so all three always agree on what
 * "WAQI" or "Mock" looks like on screen. `dashArray` makes waqi/mock
 * distinguishable from Air4Thai even in a greyscale screenshot, not just by
 * color — color alone isn't reliable for the colorblind or for print/B&W.
 */
export const SOURCE_STYLE: Record<DataSource, { color: string; dashArray?: string }> = {
  air4thai: { color: "#ffffff" },
  waqi: { color: "#2563eb", dashArray: "4,3" },
  mock: { color: "#9ca3af", dashArray: "1,3" },
};

export const ALL_SOURCES: DataSource[] = ["air4thai", "waqi", "mock"];

/** Records saved before `source` existed default to Air4Thai — the only source that existed then. */
export function resolveSource(source: DataSource | undefined): DataSource {
  return source ?? "air4thai";
}
