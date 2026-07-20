import { HeartHandshake, MapPinned, Wind } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Wind size={40} className="text-brand-600" strokeWidth={2.5} />
        <h1 className="text-xl font-bold text-gray-900">{t("about.pageTitle")}</h1>
        <p className="text-sm text-gray-500">{t("about.intro")}</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <MapPinned size={18} className="text-brand-600" />
          <h2 className="font-bold text-gray-800">{t("about.dataSourcesTitle")}</h2>
        </div>
        <p className="text-sm text-gray-600">{t("about.dataSourcesBody")}</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <HeartHandshake size={18} className="text-brand-600" />
          <h2 className="font-bold text-gray-800">{t("about.communityTitle")}</h2>
        </div>
        <p className="text-sm text-gray-600">{t("about.communityBody")}</p>
      </div>
    </div>
  );
}
