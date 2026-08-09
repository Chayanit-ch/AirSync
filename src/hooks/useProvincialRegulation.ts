import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import type { ProvincialRegulation } from "../types";

/**
 * Reads the single `provincialRegulations/{province}` doc for the user's
 * current province, if one exists — see `ProvincialRegulation`'s doc
 * comment for the collection's manual-curation-only contract.
 *
 * `null` covers three states on purpose (no separate error/loading flags):
 * `province` not known yet, no doc for this province, and a Firestore read
 * failure. All three render as "show nothing" (see `ProvincialRegulationCard`'s
 * caller in `AlertsPage`) — this collection is expected to be empty for most
 * provinces most of the time, so "no doc" must never look like an error.
 */
export function useProvincialRegulation(province: string | null): ProvincialRegulation | null {
  const [regulation, setRegulation] = useState<ProvincialRegulation | null>(null);

  useEffect(() => {
    if (!province) {
      setRegulation(null);
      return;
    }

    let cancelled = false;
    getDoc(doc(db, "provincialRegulations", province))
      .then((snap) => {
        if (cancelled) return;
        setRegulation(snap.exists() ? (snap.data() as ProvincialRegulation) : null);
      })
      .catch((error) => {
        console.warn(`Failed to read provincialRegulations/${province}`, error);
        if (!cancelled) setRegulation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [province]);

  return regulation;
}
