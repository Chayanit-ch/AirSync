import { ExternalLink, Scale } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

/**
 * Static (non-API) national-level legal notice — no Firestore, no fetch.
 * The fine/imprisonment figures and source below were independently
 * verified (2026-08-09) against the Government Public Relations Department's
 * own publication of the Pollution Control Department's warning, not
 * generated or guessed. That source itself breaks the penalty down by
 * location/severity (forest and protected-area burning carries the
 * harshest tier: 4-20 years imprisonment, 400,000-2,000,000 THB fine;
 * agricultural and general open burning carry lower tiers) — the copy below
 * intentionally states this as the MAXIMUM penalty under Thai law, not a
 * flat penalty for every act of burning, to stay accurate to that source.
 * If these figures are ever updated, re-verify against a real published
 * source before changing this file — never hardcode a new number from
 * memory or inference.
 */
const SOURCE_URL = "https://www.prd.go.th/th/content/category/detail/id/33/iid/470697";

export function LegalWarningCard() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2">
        <Scale size={16} className="shrink-0 text-red-700" />
        <p className="text-xs font-semibold text-red-700">{t("alerts.legalWarningNationalTag")}</p>
      </div>
      <h3 className="mt-1.5 text-sm font-bold text-gray-800">{t("alerts.legalWarningTitle")}</h3>
      <p className="mt-1 text-sm leading-relaxed text-gray-700">{t("alerts.legalWarningBody")}</p>
      <a
        href={SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-700"
      >
        {t("alerts.legalWarningSourceLabel")}
        <ExternalLink size={12} />
      </a>
    </div>
  );
}
