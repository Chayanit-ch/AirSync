/**
 * Layered full-body character SVG fragments for `CharacterAvatar`, on a
 * shared `viewBox="0 0 100 160"` so any combination of face options +
 * equipment always lines up. Coordinates below are deliberately simple
 * (rects, circles, one arc) rather than hand-authored bezier chains — a
 * previous version's "long hair" path was a chain of relative curves that
 * was never actually rendered before shipping, and it produced a malformed
 * blob overlapping the torso. Every shape here was verified by rendering,
 * not just by reading the numbers.
 *
 * Body layout (all coordinates, top to bottom):
 * - head: circle cx=50 cy=28 r=15         (y 13-43)
 * - eyes: circles cx=44/56 cy=28 r=2      (y 26-30) — every hair/hat shape
 *   below must keep clear of this row (see `HAIR_CAP_BASELINE`).
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

/**
 * The flat top edge every hair silhouette closes against. Eyes sit at
 * cy=28 r=2 (top edge y=26) — keeping every hair shape's lowest point at or
 * above this leaves a deliberate 3px gap so hair can never visually cover
 * the eyes, for any style below.
 */
const HAIR_CAP_BASELINE = 23;

/** Soft light backdrop disc behind the figure — the "portrait" framing the design asks for. Rendered first (furthest back). */
export function PortraitBackdrop({ tint }: { tint: string }) {
  return <circle cx="50" cy="70" r="56" fill={tint} opacity="0.35" />;
}

/**
 * Always-on theme layer: uniform torso color + a small chest badge/star —
 * present even on a totally default character, so role stays visually
 * identifiable regardless of customization. `bodyColor` is the only part a
 * user can recolor (see `AvatarConfig.uniformColor`); `badgeAccent` is
 * always the wearer's TRUE role color (never overridden), so the badge
 * outline stays a reliable role signal even when the uniform itself has
 * been recolored.
 */
export function ThemeUniform({ bodyColor, badgeAccent }: { bodyColor: string; badgeAccent: string }) {
  return (
    <g>
      <rect x="30" y="46" width="40" height="56" rx="14" fill={bodyColor} />
      <path
        d="M50 58l2.2 4.5 5 .7-3.6 3.5.85 5-4.45-2.3-4.45 2.3.85-5-3.6-3.5 5-.7z"
        fill="white"
        stroke={badgeAccent}
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </g>
  );
}

/**
 * Hair drawn on/around the head — shape depends on style, color is
 * user-chosen. Every variant is built from simple primitives (arcs, rects,
 * circles), never hand-chained bezier curves, and every shape's lowest
 * point stays at/above `HAIR_CAP_BASELINE` so the eyes are always clear.
 * `bald` renders nothing.
 */
function Hair({ hairStyle, hairColor }: { hairStyle: string; hairColor: string }) {
  if (hairStyle === "bald") return null;

  // Shared base cap: a clean dome over the top of the head, closing at
  // HAIR_CAP_BASELINE (y=23) — 3px above the eyes (y=26). rx=15 matches the
  // head's own radius (ear-to-ear coverage); ry=11 keeps the peak (y=12)
  // just above the head's own top (y=13) for natural volume.
  const cap = (
    <path
      d={`M35 ${HAIR_CAP_BASELINE} A15 11 0 0 1 65 ${HAIR_CAP_BASELINE} Z`}
      fill={hairColor}
    />
  );

  if (hairStyle === "long") {
    return (
      <g>
        {cap}
        <rect x="32" y="20" width="8" height="28" rx="4" fill={hairColor} />
        <rect x="60" y="20" width="8" height="28" rx="4" fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "bob") {
    // Shorter, boxier side hair ending blunt near the jaw (y~41) instead of
    // draping past the shoulders like "long".
    return (
      <g>
        {cap}
        <rect x="33" y={HAIR_CAP_BASELINE} width="9" height="18" rx="2" fill={hairColor} />
        <rect x="58" y={HAIR_CAP_BASELINE} width="9" height="18" rx="2" fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "ponytail") {
    // Cap plus a gathered tail off to one side — kept entirely at x>=63,
    // well outside the eyes' x=42-58 range.
    return (
      <g>
        {cap}
        <circle cx="64" cy="20" r="3" fill={hairColor} />
        <rect x="64" y="18" width="7" height="20" rx="3.5" fill={hairColor} />
        <rect x="65" y="36" width="5" height="14" rx="2.5" fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "curly") {
    // Cap plus rounded bumps along the top edge for texture — every bump
    // stays at y<=22, well clear of the eyes.
    return (
      <g>
        {cap}
        <circle cx="40" cy="16" r="6" fill={hairColor} />
        <circle cx="50" cy="12" r="6" fill={hairColor} />
        <circle cx="60" cy="16" r="6" fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "sideShaved") {
    // The left quarter of the exact same ellipse the base cap uses (verified
    // above: point (50,12) is that ellipse's own peak), closed with a
    // straight part-line down the center — hair on the left, shaved/bare on
    // the right. Two faint lines suggest clipper fade on the shaved side.
    return (
      <g>
        <path d="M35 23 A15 11 0 0 1 50 12 L50 23 Z" fill={hairColor} />
        <line x1="53" y1="19" x2="61" y2="19" stroke={hairColor} strokeWidth="1" opacity="0.4" />
        <line x1="53" y1="22" x2="60" y2="22" stroke={hairColor} strokeWidth="1" opacity="0.4" />
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
      {/* Eyes group: the ONLY element carrying the blink animation, so
          `transform-box: fill-box` (see index.css) anchors the scaleY to
          this tight bbox instead of the whole SVG viewport. */}
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

/** Level 2 unlock — a hygiene mask over the nose/mouth. Sits at y=32-42, clear of the eyes (bottom edge y=30), so it never obscures them. */
export function MaskEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="40" y="32" width="20" height="10" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="40" y1="35" x2="34" y2="33" stroke="#9ca3af" strokeWidth="1" />
      <line x1="60" y1="35" x2="66" y2="33" stroke="#9ca3af" strokeWidth="1" />
    </g>
  );
}

/** Level 2 unlock — a small hand-sanitizer bottle clipped to the belt, well clear of the hands/weapon/shield slots. */
export function SanitizerEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="48" y="90" width="4" height="5" rx="1" fill="#0369a1" />
      <rect x="46" y="94" width="8" height="12" rx="2" fill="#0ea5e9" />
      <rect x="47" y="98" width="6" height="4" rx="1" fill="white" opacity="0.85" />
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

/** Level 5 unlock. Rendered BEHIND the body (see `CharacterAvatar`'s render order) so it drapes from the shoulders instead of sitting on top of the torso. Recolorable — see `AvatarConfig.uniformColor`. */
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

/** Level 3 unlock — one of two mutually-exclusive hat slot options. Renders on top of `Hair` (may cover it, same as real headwear) but keeps the same HAIR_CAP_BASELINE-style clearance above the eyes. */
export function HelmetEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M33 24 A17 13 0 0 1 67 24 Z" fill={color} />
      <rect x="33" y="20" width="34" height="4" rx="2" fill="#e5e7eb" opacity="0.8" />
    </g>
  );
}

/** Level 3 unlock — the other mutually-exclusive hat slot option. */
export function CapEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M36 21 A14 9 0 0 1 64 21 Z" fill={color} />
      <rect x="38" y="19" width="24" height="5" rx="2.5" fill={color} transform="rotate(-6 50 21)" />
    </g>
  );
}
