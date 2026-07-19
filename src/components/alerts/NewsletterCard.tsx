import { useTranslation } from "../../hooks/useTranslation";

export function NewsletterCard() {
  const { t } = useTranslation();

  return (
    <div className="bg-brand-600 flex items-center justify-between gap-3 rounded-2xl p-4">
      <div>
        <h3 className="font-bold text-white">{t("alerts.newsletterTitle")}</h3>
        <p className="mt-1 text-sm text-white/85">
          {t("alerts.newsletterSubtitle")}
        </p>
      </div>
      <button
        type="button"
        className="text-brand-700 shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold"
      >
        {t("alerts.newsletterCta")}
      </button>
    </div>
  );
}
