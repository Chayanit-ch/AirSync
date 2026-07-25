/**
 * Layered full-body character SVG fragments for `CharacterAvatar`. Every
 * piece here is a `<g>`, never a standalone `<svg>` — they're meant to be
 * composed inside one shared `viewBox="0 0 100 160"` so a base body and any
 * combination of equipment always line up regardless of which pieces are
 * currently unlocked. Same flat/geometric line-art philosophy as
 * `GuardianBadgeIcons.tsx`, just scaled up to full-body proportions instead
 * of a small corner badge.
 */

interface BodyProps {
  /** Random per-instance delay (seconds, expected negative) so multiple on-screen characters don't blink in lockstep — see `CharacterAvatar`. */
  blinkDelay: number;
}

interface EquipmentProps {
  /** Theme-matched color, passed in by `CharacterAvatar` rather than hard-coded per body — this is what lets one equipment set serve all three themes. */
  accentColor: string;
}

/** Shared limb/torso silhouette every base body reuses — only the fill colors differ per theme (see the three exported bodies below). */
function BodySilhouette({
  bodyColor,
  headColor,
  shadeColor,
  blinkDelay,
}: {
  bodyColor: string;
  headColor: string;
  shadeColor: string;
  blinkDelay: number;
}) {
  return (
    <g>
      {/* legs */}
      <rect x="38" y="102" width="10" height="48" rx="5" fill={shadeColor} />
      <rect x="52" y="102" width="10" height="48" rx="5" fill={shadeColor} />
      {/* feet */}
      <rect x="35" y="146" width="16" height="8" rx="4" fill={bodyColor} />
      <rect x="49" y="146" width="16" height="8" rx="4" fill={bodyColor} />
      {/* torso */}
      <rect x="32" y="46" width="36" height="58" rx="12" fill={bodyColor} />
      {/* arms */}
      <rect x="18" y="50" width="12" height="42" rx="6" fill={shadeColor} />
      <rect x="70" y="50" width="12" height="42" rx="6" fill={shadeColor} />
      <circle cx="24" cy="94" r="6" fill={headColor} />
      <circle cx="76" cy="94" r="6" fill={headColor} />
      {/* head */}
      <circle cx="50" cy="26" r="16" fill={headColor} />
      {/* eyes — flattened to a line by character-blink; see index.css */}
      <g
        className="origin-center animate-character-blink"
        style={{ animationDelay: `${blinkDelay}s` }}
      >
        <circle cx="44" cy="25" r="2" fill={shadeColor} />
        <circle cx="56" cy="25" r="2" fill={shadeColor} />
      </g>
    </g>
  );
}

/** Citizen base body — emerald/brand tones, matching `GUARDIAN_BADGE_*`. */
export function CitizenBody({ blinkDelay }: BodyProps) {
  return (
    <BodySilhouette
      bodyColor="#10b981"
      headColor="#34d399"
      shadeColor="#047857"
      blinkDelay={blinkDelay}
    />
  );
}

/** Organization base body — amber/orange tones, matching `AUTHORITY_BADGE_*`. */
export function OrganizationBody({ blinkDelay }: BodyProps) {
  return (
    <BodySilhouette
      bodyColor="#f59e0b"
      headColor="#fbbf24"
      shadeColor="#b45309"
      blinkDelay={blinkDelay}
    />
  );
}

/** Government base body — navy/indigo tones, matching `GOVERNMENT_BADGE_*`. */
export function GovernmentBody({ blinkDelay }: BodyProps) {
  return (
    <BodySilhouette
      bodyColor="#4338ca"
      headColor="#6366f1"
      shadeColor="#312e81"
      blinkDelay={blinkDelay}
    />
  );
}

/** Tier 2 — protective mask/goggles across the lower face. */
export function MaskEquipment({ accentColor }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="41" y="27" width="18" height="9" rx="4" fill={accentColor} />
      <rect x="44" y="29.5" width="12" height="2" rx="1" fill="white" opacity="0.6" />
    </g>
  );
}

/** Tier 3 — light chest armor plate over the torso. */
export function ArmorEquipment({ accentColor }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M32 52 L50 46 L68 52 L68 78 L50 86 L32 78 Z" fill={accentColor} />
      <path d="M50 46 L50 86" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
    </g>
  );
}

/** Tier 4 — shield held at the character's side. */
export function ShieldEquipment({ accentColor }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path
        d="M8 58 L20 54 L32 58 L32 78 C32 90 26 97 20 100 C14 97 8 90 8 78 Z"
        fill={accentColor}
      />
      <path d="M20 60 L20 92 M12 68 L28 68" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
    </g>
  );
}

/** Tier 5 — full cape/mantle behind the back, plus a small chest emblem. */
export function CapeEquipment({ accentColor }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M30 48 C20 60 18 90 24 106 L38 100 C34 84 34 62 40 50 Z" fill={accentColor} />
      <path d="M70 48 C80 60 82 90 76 106 L62 100 C66 84 66 62 60 50 Z" fill={accentColor} />
      <path
        d="M50 60l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"
        fill="#fde68a"
      />
    </g>
  );
}
