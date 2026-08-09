import { ExternalLink, ScrollText } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { ProvincialRegulation } from "../../types";

/**
 * Renders one manually-curated `provincialRegulations` doc — see that
 * type's comment. The caller (`AlertsPage`) only renders this when
 * `useProvincialRegulation` actually returned a doc; there is no
 * "no regulation found" state here by design (see that hook's comment).
 */
export function ProvincialRegulationCard({ regulation }: { regulation: ProvincialRegulation }) {
  const { t, language } = useTranslation();
  const title = language === "en" && regulation.titleEn ? regulation.titleEn : regulation.title;
  const content = language === "en" && regulation.contentEn ? regulation.contentEn : regulation.content;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2">
        <ScrollText size={16} className="shrink-0 text-amber-700" />
        <p className="text-xs font-semibold text-amber-700">
          {t("alerts.provincialRegulationLabel", { province: regulation.province })}
        </p>
      </div>
      <h3 className="mt-1.5 text-sm font-bold text-gray-800">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-gray-700">{content}</p>
      <a
        href={regulation.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-700"
      >
        {t("alerts.viewSource")}
        <ExternalLink size={12} />
      </a>
    </div>
  );
}
