import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type LanguageCode = "th" | "en";

const STORAGE_KEY = "airsync-language";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "th";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "th" || stored === "en" ? stored : "th";
}

/**
 * TH/EN language preference — persisted to `localStorage` (not Firestore,
 * since it's not sensitive per-user data) so it survives reloads without
 * needing a signed-in user. Not synced across devices; that's an acceptable
 * tradeoff for a display preference like this.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(readStoredLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  function setLanguage(lang: LanguageCode) {
    setLanguageState(lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
