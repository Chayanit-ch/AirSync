import type { AQISeverityLevel } from "../../types";

/**
 * Custom flat SVG face icons, one per `AQISeverityLevel` — no Unicode emoji
 * per this project's design rule. Built from the same primitives as
 * `Expression()` in `components/profile/characterParts.tsx` (straight
 * lines / single arcs, no hand-chained bezier curves) so the style matches
 * the rest of the app's iconography. Entirely `currentColor`-driven: callers
 * pick color via a text-color className (or inline `style`) and can layer
 * opacity on top for decorative/background use without any per-severity
 * color prop here.
 */

interface FaceIconProps {
  size?: number;
  className?: string;
}

const commonProps = {
  viewBox: "0 0 100 100",
  fill: "none",
  stroke: "currentColor",
} as const;

const HEAD_PROPS = { cx: "50", cy: "50", r: "42", strokeWidth: 5 } as const;

/** Good — wide open smile, relaxed round eyes, no eyebrows. */
function AqiFaceGood({ size = 64, className }: FaceIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps} role="img" aria-hidden="true">
      <circle {...HEAD_PROPS} />
      <circle cx="36" cy="44" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="64" cy="44" r="3.4" fill="currentColor" stroke="none" />
      <path d="M30 58 Q50 80 70 58" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Moderate — gentle, smaller smile, relaxed round eyes. */
function AqiFaceModerate({ size = 64, className }: FaceIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps} role="img" aria-hidden="true">
      <circle {...HEAD_PROPS} />
      <circle cx="36" cy="44" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="64" cy="44" r="3.4" fill="currentColor" stroke="none" />
      <path d="M34 60 Q50 70 66 60" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Sensitive (Unhealthy for Sensitive Groups) — flat mouth, mildly worried inner-raised eyebrows. */
function AqiFaceSensitive({ size = 64, className }: FaceIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps} role="img" aria-hidden="true">
      <circle {...HEAD_PROPS} />
      <circle cx="36" cy="45" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="64" cy="45" r="3.4" fill="currentColor" stroke="none" />
      <line x1="29" y1="35" x2="40" y2="38" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="71" y1="35" x2="60" y2="38" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="35" y1="64" x2="65" y2="64" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Unhealthy — frown, worried eyebrows. */
function AqiFaceUnhealthy({ size = 64, className }: FaceIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps} role="img" aria-hidden="true">
      <circle {...HEAD_PROPS} />
      <circle cx="36" cy="46" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="64" cy="46" r="3.4" fill="currentColor" stroke="none" />
      <line x1="28" y1="34" x2="41" y2="39" strokeWidth="3.8" strokeLinecap="round" />
      <line x1="72" y1="34" x2="59" y2="39" strokeWidth="3.8" strokeLinecap="round" />
      <path d="M32 68 Q50 54 68 68" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Very Unhealthy — deeper frown, steeper eyebrows, strained squinting eyes. */
function AqiFaceVeryUnhealthy({ size = 64, className }: FaceIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps} role="img" aria-hidden="true">
      <circle {...HEAD_PROPS} />
      <line x1="31" y1="46" x2="41" y2="46" strokeWidth="3.6" strokeLinecap="round" />
      <line x1="59" y1="46" x2="69" y2="46" strokeWidth="3.6" strokeLinecap="round" />
      <line x1="27" y1="32" x2="42" y2="39" strokeWidth="4" strokeLinecap="round" />
      <line x1="73" y1="32" x2="58" y2="39" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 72 Q50 54 70 72" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

/** Hazardous — distressed open mouth, steepest eyebrows, tightly shut eyes. */
function AqiFaceHazardous({ size = 64, className }: FaceIconProps) {
  return (
    <svg width={size} height={size} className={className} {...commonProps} role="img" aria-hidden="true">
      <circle {...HEAD_PROPS} />
      <line x1="30" y1="47" x2="42" y2="43" strokeWidth="3.8" strokeLinecap="round" />
      <line x1="70" y1="47" x2="58" y2="43" strokeWidth="3.8" strokeLinecap="round" />
      <line x1="26" y1="30" x2="43" y2="39" strokeWidth="4.2" strokeLinecap="round" />
      <line x1="74" y1="30" x2="57" y2="39" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M35 70 Q50 58 65 70 Q50 82 35 70 Z" strokeWidth="4.5" strokeLinejoin="round" />
    </svg>
  );
}

export const AQI_FACE_ICONS: Record<AQISeverityLevel, typeof AqiFaceGood> = {
  good: AqiFaceGood,
  moderate: AqiFaceModerate,
  sensitive: AqiFaceSensitive,
  unhealthy: AqiFaceUnhealthy,
  veryUnhealthy: AqiFaceVeryUnhealthy,
  hazardous: AqiFaceHazardous,
};

export function AqiFaceIcon({
  severity,
  size,
  className,
}: FaceIconProps & { severity: AQISeverityLevel }) {
  const Face = AQI_FACE_ICONS[severity];
  return <Face size={size} className={className} />;
}
