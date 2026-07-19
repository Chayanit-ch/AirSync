import { useLanguage } from "../contexts/LanguageContext";
import { th } from "../locales/th";
import { en } from "../locales/en";

type Params = Record<string, string | number>;

function resolve(path: string, dict: unknown): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

/**
 * `t("home.heroTitle")` resolves a dotted path against the active language
 * dictionary (`th.ts`/`en.ts`), with `{placeholder}` interpolation for
 * dynamic values (e.g. `t("home.approxDistance", { km: 12 })`). Falls back
 * to the Thai dictionary, then to the raw key, if a path is ever missing —
 * defensive only; both dictionaries share one structural type (see `en.ts`),
 * so real usage should never hit that branch.
 *
 * `dict` exposes the whole active dictionary directly, for components that
 * need structured (non-string) data — e.g. `dict.common.months`, or
 * `dict.report.types[type]` — rather than a single interpolated string.
 */
export function useTranslation() {
  const { language } = useLanguage();
  const dict = language === "en" ? en : th;

  function t(path: string, params?: Params): string {
    const value = resolve(path, dict) ?? resolve(path, th);
    if (typeof value !== "string") {
      console.warn(`Missing translation for key "${path}"`);
      return path;
    }
    return interpolate(value, params);
  }

  return { t, language, dict };
}
