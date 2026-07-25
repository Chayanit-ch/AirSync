/**
 * Layered full-body character SVG fragments for `CharacterAvatar`, on a
 * shared `viewBox="0 0 100 160"` so any combination of face options +
 * equipment always lines up. Unlike the previous per-theme-body version,
 * there is now exactly ONE body/face shape (parameterized by skin/hair),
 * plus a theme "uniform" layer (accent color + badge) that's always shown
 * regardless of what the user has customized — that's what keeps
 * citizen/organization/government visually distinct independent of face
 * customization.
 */

export interface FaceProps {
  skinColor: string;
  hairColor: string;
  hairStyle: string;
  /** Random per-instance delay (seconds, expected negative) so multiple on-screen characters don't blink in lockstep. */
  blinkDelay: number;
}

interface EquipmentProps {
  color: string;
}

/** Soft light backdrop disc behind the figure — the "portrait" framing the design asks for. Rendered first (furthest back). */
export function PortraitBackdrop({ tint }: { tint: string }) {
  return <circle cx="50" cy="70" r="56" fill={tint} opacity="0.35" />;
}

/** Always-on theme layer: uniform torso color + a small chest badge/star — independent of any customization, so role stays visually identifiable even on a totally default character. */
export function ThemeUniform({ color }: EquipmentProps) {
  return (
    <g>
      <rect x="32" y="46" width="36" height="58" rx="12" fill={color} />
      <path
        d="M50 58l2.2 4.5 5 .7-3.6 3.5.85 5-4.45-2.3-4.45 2.3.85-5-3.6-3.5 5-.7z"
        fill="white"
        opacity="0.85"
      />
    </g>
  );
}

/** Hair drawn on/around the head — shape depends on style, color is user-chosen. `bald` renders nothing. */
function Hair({ hairStyle, hairColor }: { hairStyle: string; hairColor: string }) {
  if (hairStyle === "bald") return null;
  if (hairStyle === "long") {
    return (
      <path
        d="M32 24c0-11 8-19 18-19s18 8 18 19c0 3-1 8-2 11-1-6-3-11-6-13 1 4 1 9 0 13-2-5-4-9-8-11 0 4-1 8-2 11-3-3-5-7-6-11-2 3-3 7-4 11-2-3-3-7-3-11-2 2-3 7-3 11-1-3-2-8-2-11z"
        fill={hairColor}
      />
    );
  }
  // short
  return <path d="M33 22c0-10 7.5-17 17-17s17 7 17 17c0 2.5-.4 5-1.2 7-2-8-3-13-15.8-13S35.2 21 33.2 29c-.8-2-1.2-4.5-1.2-7z" fill={hairColor} />;
}

/** The single shared body/face — every character starts from this, then gets equipment layered on top. */
export function CharacterFace({ skinColor, hairColor, hairStyle, blinkDelay }: FaceProps) {
  return (
    <g>
      {/* legs */}
      <rect x="38" y="102" width="10" height="44" rx="5" fill="#374151" />
      <rect x="52" y="102" width="10" height="44" rx="5" fill="#374151" />
      {/* plain feet — shown only while no shoes equipment is layered on top */}
      <rect x="35" y="142" width="16" height="8" rx="4" fill={skinColor} />
      <rect x="49" y="142" width="16" height="8" rx="4" fill={skinColor} />
      {/* arms + hands */}
      <rect x="18" y="50" width="12" height="42" rx="6" fill="#4b5563" />
      <rect x="70" y="50" width="12" height="42" rx="6" fill="#4b5563" />
      <circle cx="24" cy="94" r="6" fill={skinColor} />
      <circle cx="76" cy="94" r="6" fill={skinColor} />
      {/* head + face */}
      <circle cx="50" cy="26" r="16" fill={skinColor} />
      <g
        className="origin-center animate-character-blink"
        style={{ animationDelay: `${blinkDelay}s` }}
      >
        <circle cx="44" cy="26" r="2" fill="#292524" />
        <circle cx="56" cy="26" r="2" fill="#292524" />
      </g>
      <path d="M46 33c1.3 1.2 2.7 1.2 4 1.2s2.7 0 4-1.2" stroke="#292524" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Hair hairStyle={hairStyle} hairColor={hairColor} />
    </g>
  );
}

/** Level 2 unlock — glasses over the eyes. */
export function GlassesEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <circle cx="44" cy="26" r="5" fill="none" stroke="#1f2937" strokeWidth="1.6" />
      <circle cx="56" cy="26" r="5" fill="none" stroke="#1f2937" strokeWidth="1.6" />
      <path d="M49 26h2" stroke="#1f2937" strokeWidth="1.6" />
    </g>
  );
}

/** Level 3 unlock — one of two mutually-exclusive weapon slot options. */
export function SwordEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="79" y="46" width="4" height="34" rx="1.5" fill="#d1d5db" transform="rotate(18 81 63)" />
      <rect x="76" y="78" width="10" height="4" rx="1.5" fill={color} transform="rotate(18 81 80)" />
      <rect x="79" y="82" width="4" height="10" rx="1.5" fill="#92400e" transform="rotate(18 81 87)" />
    </g>
  );
}

/** Level 3 unlock — the other mutually-exclusive weapon slot option. */
export function GunEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="74" y="86" width="16" height="6" rx="2" fill={color} />
      <rect x="86" y="90" width="6" height="8" rx="1.5" fill={color} />
    </g>
  );
}

/** Level 4 unlock. */
export function ShieldEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M8 58 L20 54 L32 58 L32 78 C32 90 26 97 20 100 C14 97 8 90 8 78 Z" fill={color} />
      <path d="M20 60 L20 92 M12 68 L28 68" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />
    </g>
  );
}

/** Level 5 unlock. */
export function CapeEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M30 48 C20 60 18 90 24 106 L38 100 C34 84 34 62 40 50 Z" fill={color} />
      <path d="M70 48 C80 60 82 90 76 106 L62 100 C66 84 66 62 60 50 Z" fill={color} />
    </g>
  );
}

/** Always available from level 1 — the ordinary (non-locked) shoe option. */
export function BasicShoesEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="34" y="144" width="18" height="7" rx="3" fill={color} />
      <rect x="48" y="144" width="18" height="7" rx="3" fill={color} />
    </g>
  );
}

/** Level 5 unlock — a visually distinct, taller boot. */
export function BootsEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="34" y="134" width="18" height="17" rx="4" fill={color} />
      <rect x="48" y="134" width="18" height="17" rx="4" fill={color} />
      <rect x="34" y="134" width="18" height="4" rx="2" fill="white" opacity="0.35" />
      <rect x="48" y="134" width="18" height="4" rx="2" fill="white" opacity="0.35" />
    </g>
  );
}
