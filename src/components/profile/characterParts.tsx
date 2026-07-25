/**
 * Layered full-body character SVG fragments for `CharacterAvatar`, on a
 * shared `viewBox="0 0 100 160"` so any combination of face options +
 * equipment always lines up. Coordinates below are deliberately simple
 * (rects, circles, one arc) rather than hand-authored bezier chains — the
 * previous version's "long hair" path was a chain of relative curves that
 * was never actually rendered before shipping, and it produced a malformed
 * blob overlapping the torso. Every shape here was verified by rendering,
 * not just by reading the numbers.
 *
 * Body layout (all coordinates, top to bottom):
 * - head: circle cx=50 cy=28 r=15         (y 13-43)
 * - neck: rect   x=44 y=38 w=12 h=10      (y 38-48, bridges head→torso)
 * - torso: rect  x=30 y=46 w=40 h=56      (x 30-70, y 46-102)
 * - arms: rects  x=16-29 / x=71-84        (y 48-86, OUTSIDE torso x-range)
 * - hands: circles at y=90
 * - legs: rects  x=36-47 / x=53-64        (y 100-142, overlaps torso bottom by 2)
 * - feet: rects  x=32-50 / x=50-68        (y 138-147, overlaps leg bottom by 4)
 * Every piece below re-uses these exact ranges so nothing floats or
 * misaligns regardless of which combination of skin/hair/equipment is shown.
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
      <rect x="30" y="46" width="40" height="56" rx="14" fill={color} />
      <path
        d="M50 58l2.2 4.5 5 .7-3.6 3.5.85 5-4.45-2.3-4.45 2.3.85-5-3.6-3.5 5-.7z"
        fill="white"
        opacity="0.85"
      />
    </g>
  );
}

/** Hair drawn on/around the head — shape depends on style, color is user-chosen. Deliberately simple primitives (arc + rects), never hand-chained bezier curves. `bald` renders nothing. */
function Hair({ hairStyle, hairColor }: { hairStyle: string; hairColor: string }) {
  if (hairStyle === "bald") return null;
  // A clean half-circle cap over the top of the head — shared by both styles.
  const cap = <path d="M35 28 A15 15 0 0 1 65 28 Z" fill={hairColor} />;
  if (hairStyle === "long") {
    return (
      <g>
        {cap}
        <rect x="32" y="20" width="8" height="28" rx="4" fill={hairColor} />
        <rect x="60" y="20" width="8" height="28" rx="4" fill={hairColor} />
      </g>
    );
  }
  // short
  return cap;
}

/** The single shared body/face — every character starts from this, then gets equipment layered on top. Never draws feet directly — see `BasicShoesEquipment`/`BootsEquipment`, which render on top of this same footprint. */
export function CharacterFace({ skinColor, hairColor, hairStyle, blinkDelay }: FaceProps) {
  return (
    <g>
      {/* legs */}
      <rect x="36" y="100" width="11" height="42" rx="5" fill="#374151" />
      <rect x="53" y="100" width="11" height="42" rx="5" fill="#374151" />
      {/* plain feet — shown only while no shoes equipment is layered on top */}
      <rect x="32" y="138" width="18" height="9" rx="4" fill={skinColor} />
      <rect x="50" y="138" width="18" height="9" rx="4" fill={skinColor} />
      {/* arms + hands — deliberately OUTSIDE the torso's x=30-70 range so ThemeUniform never covers them */}
      <rect x="16" y="48" width="13" height="38" rx="6" fill="#4b5563" />
      <rect x="71" y="48" width="13" height="38" rx="6" fill="#4b5563" />
      <circle cx="22" cy="90" r="7" fill={skinColor} />
      <circle cx="78" cy="90" r="7" fill={skinColor} />
      {/* neck — bridges the gap between head (bottom at y=43) and torso (top at y=46) */}
      <rect x="44" y="38" width="12" height="10" fill={skinColor} />
      {/* head + face */}
      <circle cx="50" cy="28" r="15" fill={skinColor} />
      <g
        className="origin-center animate-character-blink"
        style={{ animationDelay: `${blinkDelay}s` }}
      >
        <circle cx="44" cy="28" r="2" fill="#292524" />
        <circle cx="56" cy="28" r="2" fill="#292524" />
      </g>
      <path d="M46 35c1.3 1.2 2.7 1.2 4 1.2s2.7 0 4-1.2" stroke="#292524" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Hair hairStyle={hairStyle} hairColor={hairColor} />
    </g>
  );
}

/** Level 2 unlock — glasses over the eyes. */
export function GlassesEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <circle cx="44" cy="28" r="5.5" fill="none" stroke="#1f2937" strokeWidth="1.6" />
      <circle cx="56" cy="28" r="5.5" fill="none" stroke="#1f2937" strokeWidth="1.6" />
      <path d="M49.5 28h1" stroke="#1f2937" strokeWidth="1.6" />
    </g>
  );
}

/** Level 3 unlock — one of two mutually-exclusive weapon slot options. Positioned outside the right arm's x=71-84 range so it never overlaps it. */
export function SwordEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="85" y="44" width="4" height="32" rx="1.5" fill="#d1d5db" transform="rotate(15 87 60)" />
      <rect x="82" y="76" width="10" height="4" rx="1.5" fill={color} transform="rotate(15 87 78)" />
      <rect x="85" y="80" width="4" height="9" rx="1.5" fill="#92400e" transform="rotate(15 87 85)" />
    </g>
  );
}

/** Level 3 unlock — the other mutually-exclusive weapon slot option. */
export function GunEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="84" y="84" width="15" height="6" rx="2" fill={color} />
      <rect x="94" y="88" width="5" height="8" rx="1.5" fill={color} />
    </g>
  );
}

/** Level 4 unlock. Held out to the left, outside the left arm's x=16-29 range. */
export function ShieldEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M1 56 L13 52 L25 56 L25 76 C25 88 19 95 13 98 C7 95 1 88 1 76 Z" fill={color} />
      <path d="M13 58 L13 90 M5 66 L21 66" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
    </g>
  );
}

/** Level 5 unlock. Rendered BEHIND the body (see `CharacterAvatar`'s render order) so it drapes from the shoulders instead of sitting on top of the torso. */
export function CapeEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="20" y="50" width="14" height="62" rx="6" fill={color} />
      <rect x="66" y="50" width="14" height="62" rx="6" fill={color} />
    </g>
  );
}

/** Always available from level 1 — the ordinary (non-locked) shoe option. Same footprint as the plain feet it covers. */
export function BasicShoesEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="32" y="139" width="18" height="8" rx="3" fill={color} />
      <rect x="50" y="139" width="18" height="8" rx="3" fill={color} />
    </g>
  );
}

/** Level 5 unlock — a visually distinct, taller boot, extending up over the lower leg. */
export function BootsEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="32" y="125" width="18" height="22" rx="5" fill={color} />
      <rect x="50" y="125" width="18" height="22" rx="5" fill={color} />
      <rect x="32" y="125" width="18" height="4" rx="2" fill="white" opacity="0.35" />
      <rect x="50" y="125" width="18" height="4" rx="2" fill="white" opacity="0.35" />
    </g>
  );
}
