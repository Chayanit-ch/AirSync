import { CheckCircle2, ChevronDown, CircleAlert, LocateFixed, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import { createReport } from "../../services/reports";
import type { ReportType } from "../../types";
import { ImageUploader } from "./ImageUploader";

/** Samut Sakhon town center — used when a report is submitted with a manually
 * typed location, since there's no geocoding service wired up yet to turn
 * free text into coordinates. */
const DEFAULT_COORDS = { lat: 13.5475, lng: 100.2745 };

type FormErrors = Partial<
  Record<"type" | "description" | "locationLabel" | "customTypeDescription", string>
>;

export function ReportForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { currentUser, loading: authLoading } = useAuth();
  const { t, dict } = useTranslation();

  const [type, setType] = useState<ReportType | "">("");
  const [customTypeDescription, setCustomTypeDescription] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [locationLabel, setLocationLabel] = useState("");
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [email, setEmail] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    if (!submitResult) return;
    const timer = setTimeout(() => setSubmitResult(null), 5000);
    return () => clearTimeout(timer);
  }, [submitResult]);

  function handleLocate() {
    setLocationNotice(null);

    if (!navigator.geolocation) {
      setLocationNotice(t("report.geoUnsupported"));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocationLabel(
          t("report.currentLocationLabel", {
            lat: latitude.toFixed(4),
            lng: longitude.toFixed(4),
          }),
        );
        setIsLocating(false);
      },
      () => {
        // Permission denied or unavailable — leave the manual text input usable.
        setLocationNotice(t("report.geoDenied"));
        setIsLocating(false);
      },
      { timeout: 10000 },
    );
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!type) nextErrors.type = t("report.errorSelectType");
    if (type === "other" && !customTypeDescription.trim()) {
      nextErrors.customTypeDescription = t("report.errorSpecifyType");
    }
    if (!description.trim()) nextErrors.description = t("report.errorDescription");
    if (!locationLabel.trim()) nextErrors.locationLabel = t("report.errorLocation");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitResult(null);
    if (!validate()) return;
    if (authLoading || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createReport({
        type: type as ReportType,
        customTypeDescription: type === "other" ? customTypeDescription.trim() : undefined,
        description: description.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        locationLabel: locationLabel.trim(),
        contactEmail: email.trim() || null,
      });

      setType("");
      setCustomTypeDescription("");
      setDescription("");
      setImages([]);
      setLocationLabel("");
      setCoords(DEFAULT_COORDS);
      setEmail("");
      setLocationNotice(null);
      setErrors({});
      setSubmitResult({ kind: "success", message: t("report.submitSuccess") });
      onSubmitted?.();
    } catch (error) {
      console.error("Failed to submit report", error);
      setSubmitResult({ kind: "error", message: t("report.submitError") });
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitDisabled = authLoading || !currentUser || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
    >
      <h2 className="text-lg font-bold text-gray-800">{t("report.formTitle")}</h2>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("report.incidentType")}
        </label>
        <div className="relative">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReportType | "")}
            className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 ${
              errors.type ? "border-red-300" : "border-gray-200"
            }`}
          >
            <option value="" disabled>
              {t("report.selectIncidentType")}
            </option>
            {Object.entries(dict.report.types).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400"
          />
        </div>
        {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
      </div>

      {type === "other" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("report.specifyType")}
          </label>
          <input
            type="text"
            value={customTypeDescription}
            onChange={(e) => setCustomTypeDescription(e.target.value)}
            placeholder={t("report.specifyTypePlaceholder")}
            className={`w-full rounded-xl border px-3.5 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-brand-500 ${
              errors.customTypeDescription ? "border-red-300" : "border-gray-200"
            }`}
          />
          {errors.customTypeDescription && (
            <p className="mt-1 text-xs text-red-500">{errors.customTypeDescription}</p>
          )}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("report.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder={t("report.descriptionPlaceholder")}
          className={`w-full resize-none rounded-xl border px-3.5 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-brand-500 ${
            errors.description ? "border-red-300" : "border-gray-200"
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      <div>
        <ImageUploader images={images} onChange={setImages} />
        <p className="mt-1.5 text-xs text-gray-400">
          {t("report.uploadComingSoon")}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("report.locationLabel")}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder={t("report.locationPlaceholder")}
            className={`w-full rounded-xl border px-3.5 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-brand-500 ${
              errors.locationLabel ? "border-red-300" : "border-gray-200"
            }`}
          />
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            aria-label={t("report.useCurrentLocation")}
            className={`flex shrink-0 items-center justify-center rounded-xl bg-teal-500 px-4 text-white transition-colors hover:bg-teal-600 disabled:opacity-60 ${
              isLocating ? "animate-pulse" : ""
            }`}
          >
            <LocateFixed size={19} />
          </button>
        </div>
        {errors.locationLabel && (
          <p className="mt-1 text-xs text-red-500">{errors.locationLabel}</p>
        )}
        {locationNotice && (
          <p className="mt-1 text-xs text-gray-400">{locationNotice}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("report.contactInfo")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("report.emailPlaceholder")}
          className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
        />
      </div>

      {submitResult && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm font-medium ${
            submitResult.kind === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {submitResult.kind === "success" ? (
            <CheckCircle2 size={17} className="shrink-0" />
          ) : (
            <CircleAlert size={17} className="shrink-0" />
          )}
          {submitResult.message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="bg-brand-600 hover:bg-brand-700 flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
        {isSubmitting ? t("common.submitting") : t("report.submitButton")}
      </button>
    </form>
  );
}
