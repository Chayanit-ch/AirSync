import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useOnboardingTour } from "../../contexts/OnboardingTourContext";
import { useTranslation } from "../../hooks/useTranslation";

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 14;
const VIEWPORT_MARGIN = 12;

/**
 * `data-tour-id` can appear on more than one element at once (`Sidebar`'s
 * desktop nav and `BottomNav`'s mobile nav both use the same ids — only one
 * is actually laid out at a given viewport width). Picks the first match
 * that has real layout (not `display:none` behind a `lg:hidden`/`hidden
 * lg:flex` breakpoint class).
 */
function findVisibleTourTarget(targetId: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour-id="${targetId}"]`);
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

/**
 * First-run guided tour overlay — dims the screen, cuts a spotlight hole
 * around the current step's target (the "huge box-shadow ring" technique:
 * a transparent rounded box whose `box-shadow` paints everything outside
 * it, no SVG mask needed), and shows a tooltip with Next/Skip. Renders
 * `null` whenever the tour isn't active, so it's cheap to mount unconditionally.
 */
export function TourOverlay() {
  const { isActive, stepIndex, steps, next, skip } = useOnboardingTour();
  const { t } = useTranslation();
  const step = steps[stepIndex];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!isActive || !step) return;

    function measure() {
      const target = findVisibleTourTarget(step.targetId);
      if (!target) {
        console.warn(`Onboarding tour: no visible element for data-tour-id="${step.targetId}".`);
        setTargetRect(null);
        return;
      }
      setTargetRect(target.getBoundingClientRect());
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [isActive, step]);

  // A `useLayoutEffect` keyed on `[stepIndex, targetRect]` looked right but
  // wasn't: when the tour first opens, `tooltipRef.current` flips from
  // `null` to a real element (the early `return null` below unmounts it
  // while inactive) without `stepIndex`/`targetRect` necessarily changing
  // value on that same render, so the dependency array didn't detect it and
  // the effect never re-measured — the tooltip got stuck using its initial
  // `{width: 0, height: 0}` forever. A `ResizeObserver` sidesteps the whole
  // "did the right dependency change" question by reacting to the element's
  // actual rendered size directly, however/whenever it changes (mount,
  // step's text length, viewport resize).
  useEffect(() => {
    if (!isActive || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setTooltipSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isActive]);

  if (!isActive || !step) return null;

  const isLastStep = stepIndex === steps.length - 1;

  const spotlightStyle = targetRect
    ? {
        top: targetRect.top - SPOTLIGHT_PADDING,
        left: targetRect.left - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  // Anchor the tooltip below/above the target per the step's preferred
  // placement, then clamp both axes so it never runs off-screen — important
  // on the app's narrow mobile-frame layout (see `PageLayout`'s max-width).
  let tooltipTop: number;
  if (targetRect) {
    tooltipTop =
      step.placement === "bottom"
        ? targetRect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP
        : targetRect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP - tooltipSize.height;
  } else {
    tooltipTop = window.innerHeight / 2 - tooltipSize.height / 2;
  }
  tooltipTop = Math.min(
    Math.max(tooltipTop, VIEWPORT_MARGIN),
    window.innerHeight - tooltipSize.height - VIEWPORT_MARGIN,
  );

  let tooltipLeft = targetRect
    ? targetRect.left + targetRect.width / 2 - tooltipSize.width / 2
    : window.innerWidth / 2 - tooltipSize.width / 2;
  tooltipLeft = Math.min(
    Math.max(tooltipLeft, VIEWPORT_MARGIN),
    window.innerWidth - tooltipSize.width - VIEWPORT_MARGIN,
  );

  return (
    <div
      className="fixed inset-0 z-2000"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      {spotlightStyle ? (
        <div
          className="pointer-events-none fixed rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all duration-300"
          style={spotlightStyle}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65" />
      )}

      <div
        ref={tooltipRef}
        className="animate-dropdown-in fixed w-[calc(100vw-24px)] max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 id="onboarding-tour-title" className="text-base font-bold text-gray-800">
            {t(step.titleKey)}
          </h3>
          <button
            type="button"
            onClick={skip}
            aria-label={t("onboarding.skip")}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-50"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-gray-600">{t(step.bodyKey)}</p>
        {isLastStep && (
          <p className="mt-1.5 text-xs text-gray-400">{t("onboarding.finishHint")}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            {t("onboarding.stepCounter", { current: stepIndex + 1, total: steps.length })}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={skip}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              {t("onboarding.skip")}
            </button>
            <button
              type="button"
              onClick={next}
              className="bg-brand-600 hover:bg-brand-700 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              {isLastStep ? t("onboarding.readyToStart") : t("onboarding.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
