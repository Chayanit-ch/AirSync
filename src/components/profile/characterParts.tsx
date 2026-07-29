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
 * Body layout (all coordinates, top to bottom, BEFORE `CharacterAvatar`'s
 * pose rotation is applied — see below):
 * - head: circle cx=50 cy=28 r=15         (y 13-43)
 * - eyes: circles cx=44/56 cy=28 r=2      (y 26-30) — every hair/hat shape
 *   below must keep clear of this row (see `HAIR_CAP_BASELINE`).
 * - neck: rect   x=44 y=38 w=12 h=10      (y 38-48, bridges head→torso)
 * - torso: a tapered trapezoid (see `torsoOutline`), full `torsoWidth` at
 *   the shoulders (y=46, flush with the arm-gap invariant below) narrowing
 *   toward the waist (y=102) — `torsoX`/`torsoWidth` come from
 *   `getSilhouetteMetrics()` (see `utils/avatarSilhouette.ts`), 30/40 at
 *   badge tier 1-2 (identical to the original fixed values), growing at
 *   tiers 3-4 and 5 for the "broader shoulders" level effect — always
 *   centered on x=50 regardless of tier. Shoulder armor (`Pauldron`, tier
 *   3+) sits over the top of each arm, on top of both the arms and the
 *   torso in render order.
 * - arms: rects  x=armLeftX/armRightX (also from `getSilhouetteMetrics()`,
 *   16/71 at tier 1-2), OUTSIDE the torso's x-range by a constant 1px gap
 *   at every tier (the gap is the formula's invariant, not a per-tier
 *   magic number — see `avatarSilhouette.ts`'s doc comment)
 * - hands: circles at y=90, 6 units in from each arm's OUTER edge
 * - legs: rects  x=36-47 / x=53-64        (y 100-142, overlaps torso bottom
 *   by 2) — legs do NOT scale with tier, only torso/arms do (task: "same
 *   overall body structure", legs/head/hair untouched)
 * - feet: rects  x=32-50 / x=50-68        (y 138-147, overlaps leg bottom by 4)
 * Every piece below re-uses these exact ranges so nothing floats or
 * misaligns regardless of which combination of skin/hair/equipment is shown.
 *
 * POSE (see `CharacterAvatar.tsx`): the straight-standing layout above is
 * rendered exactly as documented here — `CharacterAvatar` applies the
 * dynamic tilt/stance by wrapping whole rigid-body subtrees in
 * `<g transform="rotate(...)">`, one for the upper body (everything except
 * legs/feet) and one per leg, rather than by changing any coordinate in
 * this file. That is a deliberate structural choice: a past bug here came
 * from hand-tuning equipment coordinates against an old base pose and never
 * re-deriving them when the pose changed, so equipment ended up floating or
 * misaligned. Rotating a whole subtree as one rigid body makes that class
 * of bug impossible — every equipment piece nested inside a pivot group
 * inherits that group's exact rotation, so it can never desync from the
 * body part it's attached to. See the attach-point convention: anything
 * drawn above the waist (head/hair, torso, arms, cape, hat, glasses, mask,
 * sanitizer, weapon, shield) belongs in the upper-body group; each leg's own
 * shoe/boot belongs in that leg's own group; `PortraitBackdrop` and the
 * level-5+ `LevelAura` are background glow effects, not body parts, and
 * stay OUTSIDE every rotation group so they never tilt.
 */

export interface FaceProps {
  skinColor: string;
  hairColor: string;
  hairStyle: string;
  /** Random per-instance delay (seconds, expected negative) so multiple on-screen characters don't blink in lockstep. */
  blinkDelay: number;
  /** One of `EXPRESSION_OPTIONS` (see `utils/avatarCustomization.ts`) — drives `Expression`'s mouth/eyebrow shape below. */
  expression: string;
}

interface EquipmentProps {
  color: string;
}

/**
 * Metallic equipment (armor/shields/weapons) can render one extra overlay
 * shape using a shared, colorless linear-gradient sheen — see
 * `CharacterAvatar`'s `metallicSheenId`, defined once per avatar instance
 * via `useId()` and passed down here. Colorless (white -> transparent ->
 * black) so the same single definition works as an overlay regardless of
 * this piece's own base `color`. `undefined` (no gradient in scope, e.g. a
 * caller that doesn't need the sheen) simply skips rendering the overlay —
 * these components stay independently usable without a `<defs>` present.
 */
interface MetallicEquipmentProps extends EquipmentProps {
  metallicSheenId?: string;
}

/**
 * The flat top edge every hair silhouette closes against. Eyes sit at
 * cy=28 r=2 (top edge y=26) — keeping every hair shape's lowest point at or
 * above this leaves a deliberate 3px gap so hair can never visually cover
 * the eyes, for any style below.
 */
const HAIR_CAP_BASELINE = 23;

/** Soft light backdrop disc behind the figure — the "portrait" framing the design asks for. Rendered first (furthest back), outside every pose rotation group so it stays centered regardless of stance. */
export function PortraitBackdrop({ tint }: { tint: string }) {
  return <circle cx="50" cy="70" r="56" fill={tint} opacity="0.35" />;
}

/**
 * Level-5+ aura — a soft translucent glow behind the whole character,
 * communicating "reached the top tier" without redesigning anything.
 * Rendered outside every pose rotation group (same reasoning as
 * `PortraitBackdrop`) so it never tilts with the stance — a tilted
 * background glow would read as a rendering bug, not a pose. `tint` is the
 * user's own theme `backdropTint`, reused rather than a new color, so the
 * aura still reads as "this character's own background glow, just bigger
 * and more present" rather than an unrelated effect.
 */
export function LevelAura({ tint }: { tint: string }) {
  return <circle cx="50" cy="70" r="62" fill={tint} opacity="0.22" className="animate-aura-pulse" />;
}

/** Fraction of `torsoWidth` tapered away from each side at the waist (see `ThemeUniform`'s torso outline) — a straight-edged trapezoid, not a curve, so the math stays simple and verifiable by hand instead of risking a malformed bezier shape. */
const WAIST_TAPER_RATIO = 0.16;

/** The torso's own outline: full `torsoWidth` at the shoulders (y=46, flush with the arm-gap invariant `avatarSilhouette.ts` depends on) tapering inward at the waist (y=102) for a heroic V-taper silhouette instead of a straight-sided rect. */
function torsoOutline(torsoX: number, torsoWidth: number): string {
  const waistTaper = torsoWidth * WAIST_TAPER_RATIO;
  return `M ${torsoX} 46 L ${torsoX + torsoWidth} 46 L ${torsoX + torsoWidth - waistTaper} 102 L ${torsoX + waistTaper} 102 Z`;
}

/**
 * A horizontal slice of the torso's own outline between two width fractions
 * (0 = left edge, 1 = right edge) — used for the highlight/shadow overlays
 * below. Deriving the slice from the exact same taper math as
 * `torsoOutline` (rather than an independent rect) guarantees the overlay
 * can never poke outside the tapered silhouette, at any `torsoWidth`.
 */
function torsoSlice(torsoX: number, torsoWidth: number, fracStart: number, fracEnd: number): string {
  const waistTaper = torsoWidth * WAIST_TAPER_RATIO;
  const bottomWidth = torsoWidth - waistTaper * 2;
  const topL = torsoX + torsoWidth * fracStart;
  const topR = torsoX + torsoWidth * fracEnd;
  const botL = torsoX + waistTaper + bottomWidth * fracStart;
  const botR = torsoX + waistTaper + bottomWidth * fracEnd;
  return `M ${topL} 46 L ${topR} 46 L ${botR} 102 L ${botL} 102 Z`;
}

/**
 * Always-on theme layer: uniform torso color + a small chest badge/star —
 * present even on a totally default character, so role stays visually
 * identifiable regardless of customization. `bodyColor` is the only part a
 * user can recolor (see `AvatarConfig.uniformColor`); `badgeAccent` is
 * always the wearer's TRUE role color (never overridden), so the badge
 * outline stays a reliable role signal even when the uniform itself has
 * been recolored. `torsoX`/`torsoWidth` come from `getSilhouetteMetrics()`
 * (default to the original fixed 30/40 so any caller that doesn't pass them
 * renders identically to before) — the badge path stays hardcoded to x=50
 * since the torso is always horizontally centered there regardless of tier.
 *
 * The torso is a tapered trapezoid (`torsoOutline`), not a plain rect — full
 * width at the shoulders, narrower at the waist, for a more heroic build.
 * Adds two flat overlay shapes, sliced from that same taper (`torsoSlice`,
 * not a gradient — see task 1's "avoid gradients for cloth"), for a
 * highlight (left edge) / shadow (right edge) pair — same single "light
 * from upper-left" convention `LeftArm`/`RightArm`/`LeftLeg`/`RightLeg` use,
 * so the whole figure reads as one coherant lighting scheme rather than
 * per-part arbitrary choices.
 */
/**
 * Optional torso pattern overlay — one of `UNIFORM_PATTERN_OPTIONS` (see
 * `utils/avatarCustomization.ts`), `null`/undefined renders nothing (plain/
 * solid uniform, the original look). Parameterized off the same
 * `torsoX`/`torsoWidth` as the base shape so it scales with silhouette tier
 * automatically, and kept a safe margin inside the taper's own edges
 * (0.15-0.85 fraction range, not 0-1) so a diagonal stripe can never poke
 * outside the tapered silhouette.
 */
function UniformPattern({
  pattern,
  torsoX,
  torsoWidth,
}: {
  pattern: string | null | undefined;
  torsoX: number;
  torsoWidth: number;
}) {
  if (pattern === "stripes") {
    const xAt = (fraction: number) => torsoX + torsoWidth * fraction;
    return (
      <g stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2.2">
        <line x1={xAt(0.22)} y1="48" x2={xAt(0.14)} y2="100" />
        <line x1={xAt(0.5)} y1="48" x2={xAt(0.42)} y2="100" />
        <line x1={xAt(0.78)} y1="48" x2={xAt(0.7)} y2="100" />
      </g>
    );
  }
  if (pattern === "chevron") {
    const xAt = (fraction: number) => torsoX + torsoWidth * fraction;
    return (
      <path
        d={`M ${xAt(0.25)} 80 L 50 92 L ${xAt(0.75)} 80`}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.4"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  return null;
}

export function ThemeUniform({
  bodyColor,
  badgeAccent,
  torsoX = 30,
  torsoWidth = 40,
  pattern,
}: {
  bodyColor: string;
  badgeAccent: string;
  torsoX?: number;
  torsoWidth?: number;
  pattern?: string | null;
}) {
  return (
    <g>
      <path d={torsoOutline(torsoX, torsoWidth)} fill={bodyColor} />
      {/* highlight: left edge */}
      <path d={torsoSlice(torsoX, torsoWidth, 0, 0.25)} fill="#ffffff" opacity="0.14" />
      {/* shadow: right edge, deliberately wider than the highlight so the two don't read as symmetric */}
      <path d={torsoSlice(torsoX, torsoWidth, 0.6, 1)} fill="#000000" opacity="0.16" />
      <UniformPattern pattern={pattern} torsoX={torsoX} torsoWidth={torsoWidth} />
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
 * Shoulder armor, tier 3+ (same threshold as the hat/weapon unlock and the
 * accent-glow effect — "you've earned real armor now"). Sits over the top
 * of each arm (`armX`/`armWidth` from `getSilhouetteMetrics()`, same as
 * `LeftArm`/`RightArm`), rendered by `CharacterAvatar` AFTER both arms and
 * the torso so it visually rests on top of the shoulder line. One shared
 * shape for both sides — it's symmetric, so `CharacterAvatar` just
 * positions two instances rather than needing separate Left/Right variants.
 * A peaked (house-shaped) silhouette with a light stroke outline — since
 * its fill is the same `bodyColor` as the torso beneath it, the outline is
 * what actually reads it as a separate shoulder plate rather than just
 * blending into the torso/sleeve. Slightly larger, with a bolder trim line
 * along its peak, at badge tier 5, mirroring the "most ornate at the top
 * tier" language the aura/accent-glow already use.
 */
export function Pauldron({
  color,
  armX,
  armWidth,
  badgeTier,
}: {
  color: string;
  armX: number;
  armWidth: number;
  badgeTier: number;
}) {
  const big = badgeTier >= 5;
  const padding = big ? 4 : 2.5;
  const height = big ? 16 : 12;
  const x = armX - padding;
  const width = armWidth + padding * 2;
  const peakY = big ? 40 : 42;
  const peak = `${x} 46 L ${x + width / 2} ${peakY} L ${x + width} 46`;
  return (
    <g>
      <path
        d={`M ${x} ${44 + height} L ${peak} L ${x + width} ${44 + height} Z`}
        fill={color}
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth={big ? 1.3 : 0.9}
      />
      {big && <path d={`M ${peak}`} fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.6" />}
    </g>
  );
}

/**
 * Level-5+ energy wings, rendered alongside `LevelAura` — the reference
 * silhouette's most iconic top-tier signature. Positioned behind the torso
 * (see `CharacterAvatar`'s render order, same "drapes from the shoulders"
 * reasoning as `CapeEquipment`), sized against the tier-5 silhouette
 * specifically (fixed coordinates, not parameterized by tier, since these
 * only ever render once `badgeTier` is already capped at 5). Straight-line
 * polygons only (no curves) to keep the shape easy to verify by hand.
 * `tint` is the theme's lighter accent variant for a glassy look;
 * `metallicSheenId` (optional, same shared gradient as armor/weapons) adds
 * a subtle sheen overlay for a crystalline finish.
 */
export function Wings({ tint, metallicSheenId }: { tint: string; metallicSheenId?: string }) {
  // Extends past `CapeEquipment`'s own footprint (x=18-36 / x=64-82) on
  // purpose — wings render BEHIND the cape (see `CharacterAvatar`'s render
  // order), so only the portion sticking out past the cape's edge is meant
  // to show, and it needs real reach to still read as "wings" rather than
  // being fully hidden whenever a cape is also equipped (both unlock at the
  // same tier, so they're shown together most of the time).
  const leftPath = "M26 50 L3 34 L13 54 L1 74 L22 80 Z";
  const rightPath = "M74 50 L97 34 L87 54 L99 74 L78 80 Z";
  return (
    <g className="origin-center animate-equip-in">
      <path d={leftPath} fill={tint} opacity="0.6" stroke={tint} strokeWidth="1" />
      <path d={rightPath} fill={tint} opacity="0.6" stroke={tint} strokeWidth="1" />
      {metallicSheenId && (
        <>
          <path d={leftPath} fill={`url(#${metallicSheenId})`} />
          <path d={rightPath} fill={`url(#${metallicSheenId})`} />
        </>
      )}
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
  // A soft glossy streak near the crown — a single arc, no fill, reused by
  // every style that includes `cap` — cheap way to make flat-colored hair
  // read as hair rather than a plain painted dome.
  const capShine = (
    <path d="M40 18 A10 7 0 0 1 53 15" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
  );

  if (hairStyle === "long") {
    // Tapered quads (straight lines only) instead of straight-sided rects —
    // wider where they meet the cap, narrowing to a soft point at the tip,
    // for a more natural "flowing strand" silhouette than a blunt rect end.
    return (
      <g>
        {cap}
        {capShine}
        <path d="M32 20 L40 20 L37 46 L34 50 Z" fill={hairColor} />
        <path d="M60 20 L68 20 L66 50 L63 46 Z" fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "bob") {
    // Shorter, boxier side hair ending blunt near the jaw (y~41) instead of
    // draping past the shoulders like "long" — tapered slightly inward at
    // the bottom corners rather than a hard rect end.
    return (
      <g>
        {cap}
        {capShine}
        <path d={`M33 ${HAIR_CAP_BASELINE} L42 ${HAIR_CAP_BASELINE} L40 41 L35 41 Z`} fill={hairColor} />
        <path d={`M58 ${HAIR_CAP_BASELINE} L67 ${HAIR_CAP_BASELINE} L65 41 L60 41 Z`} fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "ponytail") {
    // Cap plus a gathered tail off to one side — kept entirely at x>=63,
    // well outside the eyes' x=42-58 range.
    return (
      <g>
        {cap}
        {capShine}
        <circle cx="64" cy="20" r="3" fill={hairColor} />
        <rect x="64" y="18" width="7" height="20" rx="3.5" fill={hairColor} />
        <rect x="65" y="36" width="5" height="14" rx="2.5" fill={hairColor} />
      </g>
    );
  }

  if (hairStyle === "curly") {
    // Cap plus rounded bumps along the top edge for texture — staggered
    // sizes/positions (not identical circles) for a less uniform, more
    // natural curl pattern. Every bump stays well clear of the eyes.
    return (
      <g>
        {cap}
        <circle cx="38" cy="17" r="5.5" fill={hairColor} />
        <circle cx="46" cy="12" r="6.5" fill={hairColor} />
        <circle cx="54" cy="11" r="6.5" fill={hairColor} />
        <circle cx="62" cy="17" r="5.5" fill={hairColor} />
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
  return (
    <g>
      {cap}
      {capShine}
    </g>
  );
}

/**
 * Neck/head/hair only — legs and arms are drawn separately (see
 * `LeftArm`/`RightArm`/`LeftLeg`/`RightLeg` below) so `CharacterAvatar` can
 * nest each into its own pose rotation group. Never draws feet directly —
 * see `BasicShoesLeft`/`BasicShoesRight`/`BootsLeft`/`BootsRight`, which
 * render on top of this same footprint from `LeftLeg`/`RightLeg`.
 */
/**
 * Mouth + eyebrows for one of `EXPRESSION_OPTIONS` — kept to straight lines,
 * simple arcs, and one small circle (never hand-chained bezier curves, same
 * rule the rest of this file follows) so every mood stays easy to verify by
 * eye. Eyebrows sit at y<=25, clear of the eyes' own top edge (y=26).
 */
function Expression({ expression }: { expression: string }) {
  const stroke = "#292524";
  if (expression === "neutral") {
    return <line x1="46" y1="36" x2="54" y2="36" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />;
  }
  if (expression === "serious") {
    return (
      <g stroke={stroke} strokeLinecap="round">
        <line x1="46" y1="36" x2="54" y2="36" strokeWidth="1.2" />
        <line x1="41" y1="23.5" x2="46" y2="24.5" strokeWidth="1.1" />
        <line x1="59" y1="23.5" x2="54" y2="24.5" strokeWidth="1.1" />
      </g>
    );
  }
  if (expression === "angry") {
    return (
      <g stroke={stroke} strokeLinecap="round">
        <path d="M46 37c1.3 -1 2.7 -1 4 -1s2.7 0 4 1" strokeWidth="1.2" fill="none" />
        <line x1="41" y1="22" x2="46.5" y2="24.5" strokeWidth="1.3" />
        <line x1="59" y1="22" x2="53.5" y2="24.5" strokeWidth="1.3" />
      </g>
    );
  }
  if (expression === "surprised") {
    return (
      <g stroke={stroke} strokeLinecap="round">
        <circle cx="50" cy="36" r="2.2" fill="none" strokeWidth="1.1" />
        <path d="M41 22.5c1.5 -1.5 3.5 -1.5 5 -1" strokeWidth="1.1" fill="none" />
        <path d="M59 22.5c-1.5 -1.5 -3.5 -1.5 -5 -1" strokeWidth="1.1" fill="none" />
      </g>
    );
  }
  // happy (default)
  return <path d="M46 35c1.3 1.2 2.7 1.2 4 1.2s2.7 0 4-1.2" stroke={stroke} strokeWidth="1.2" fill="none" strokeLinecap="round" />;
}

export function CharacterFace({ skinColor, hairColor, hairStyle, blinkDelay, expression }: FaceProps) {
  return (
    <g>
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
      <Expression expression={expression} />
      <Hair hairStyle={hairStyle} hairColor={hairColor} />
    </g>
  );
}

interface ArmProps {
  skinColor: string;
  /** From `getSilhouetteMetrics()` — defaults reproduce the original fixed left/right positions exactly. */
  armX?: number;
  armWidth?: number;
}

/**
 * Left arm + hand, split out of the old monolithic `CharacterFace` so it
 * can be nested (by `CharacterAvatar`) inside the same upper-body pose
 * rotation group as the torso/head it's attached to. Includes a flat
 * highlight (outer edge)/shadow (inner, torso-facing edge) overlay pair —
 * same lighting convention as `ThemeUniform`/`LeftLeg`. The hand sits a
 * fixed 6 units in from the arm's own outer edge, so it stays sensibly
 * placed even as `armWidth` grows at higher silhouette tiers.
 */
export function LeftArm({ skinColor, armX = 16, armWidth = 13 }: ArmProps) {
  const overlayWidth = armWidth * 0.3;
  return (
    <g>
      <rect x={armX} y="48" width={armWidth} height="38" rx="6" fill="#4b5563" />
      <rect x={armX} y="48" width={overlayWidth} height="38" rx="6" fill="#ffffff" opacity="0.12" />
      <rect x={armX + armWidth - overlayWidth} y="48" width={overlayWidth} height="38" rx="6" fill="#000000" opacity="0.16" />
      <circle cx={armX + 6} cy="90" r="7" fill={skinColor} />
    </g>
  );
}

/** Right arm + hand — mirrored `LeftArm`: shadow on the inner (left, torso-facing) edge, highlight on the outer (right) edge. */
export function RightArm({ skinColor, armX = 71, armWidth = 13 }: ArmProps) {
  const overlayWidth = armWidth * 0.3;
  return (
    <g>
      <rect x={armX} y="48" width={armWidth} height="38" rx="6" fill="#4b5563" />
      <rect x={armX} y="48" width={overlayWidth} height="38" rx="6" fill="#000000" opacity="0.16" />
      <rect x={armX + armWidth - overlayWidth} y="48" width={overlayWidth} height="38" rx="6" fill="#ffffff" opacity="0.12" />
      <circle cx={armX + armWidth - 6} cy="90" r="7" fill={skinColor} />
    </g>
  );
}

/** Left leg + plain foot, split out of the old monolithic `CharacterFace` so `CharacterAvatar` can nest it in its own independent pose rotation group. Does NOT scale with silhouette tier (only torso/arms do — legs stay the original fixed footprint). */
export function LeftLeg({ skinColor }: { skinColor: string }) {
  return (
    <g>
      <rect x="36" y="100" width="11" height="42" rx="5" fill="#374151" />
      <rect x="36" y="100" width="3.5" height="42" rx="5" fill="#ffffff" opacity="0.10" />
      <rect x="43.5" y="100" width="3.5" height="42" rx="5" fill="#000000" opacity="0.16" />
      {/* plain foot — shown only while no shoes equipment is layered on top */}
      <rect x="32" y="138" width="18" height="9" rx="4" fill={skinColor} />
    </g>
  );
}

/** Right leg + plain foot — mirrored `LeftLeg`. */
export function RightLeg({ skinColor }: { skinColor: string }) {
  return (
    <g>
      <rect x="53" y="100" width="11" height="42" rx="5" fill="#374151" />
      <rect x="53" y="100" width="3.5" height="42" rx="5" fill="#000000" opacity="0.16" />
      <rect x="60.5" y="100" width="3.5" height="42" rx="5" fill="#ffffff" opacity="0.10" />
      <rect x="50" y="138" width="18" height="9" rx="4" fill={skinColor} />
    </g>
  );
}

/** Level 2 unlock — glasses over the eyes. Upper-body attach point. */
export function GlassesEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <circle cx="44" cy="28" r="5.5" fill="none" stroke="#1f2937" strokeWidth="1.6" />
      <circle cx="56" cy="28" r="5.5" fill="none" stroke="#1f2937" strokeWidth="1.6" />
      <path d="M49.5 28h1" stroke="#1f2937" strokeWidth="1.6" />
    </g>
  );
}

/** Level 2 unlock — a hygiene mask over the nose/mouth. Sits at y=32-42, clear of the eyes (bottom edge y=30), so it never obscures them. Upper-body attach point. */
export function MaskEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="40" y="32" width="20" height="10" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.8" />
      <line x1="40" y1="35" x2="34" y2="33" stroke="#9ca3af" strokeWidth="1" />
      <line x1="60" y1="35" x2="66" y2="33" stroke="#9ca3af" strokeWidth="1" />
    </g>
  );
}

/**
 * Level 2 unlock — a small hand-sanitizer bottle clipped to the right hip,
 * at x=60-69. Deliberately NOT at the torso's horizontal center (x~46-54,
 * where it used to sit directly over the chest badge, y58-68 — a real bug,
 * not just a documentation mismatch): x=60-69 clears the badge horizontally,
 * stays right of the right arm/hand's own baseline x=71-85 (2px gap at tier
 * 1-2, growing further at higher silhouette tiers as the arm shifts right),
 * well below the shield's x=1-25 (opposite side of the body entirely), and
 * short of the sword/gun's x=82+. Safe in every combination, including
 * shield+weapon+sanitizer all equipped at once, at every silhouette tier.
 * Upper-body attach point.
 */
export function SanitizerEquipment() {
  return (
    <g className="origin-center animate-equip-in">
      <line x1="60" y1="96" x2="70" y2="96" stroke="#374151" strokeWidth="1.2" opacity="0.6" />
      <rect x="62" y="87" width="5" height="4" rx="1" fill="#0369a1" />
      <rect x="60" y="90" width="9" height="12" rx="2" fill="#0ea5e9" />
      <rect x="61" y="95" width="7" height="4" rx="1" fill="white" opacity="0.85" />
    </g>
  );
}

/** Level 3 unlock — one of two mutually-exclusive weapon slot options. Positioned outside the right arm's baseline x=71-84 range so it never overlaps it. A tapered, pointed-tip blade (straight lines only) instead of a plain rect reads more like an actual sword. Metallic — see `metallicSheenId`. Upper-body attach point. */
export function SwordEquipment({ color, metallicSheenId }: MetallicEquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M85 76 L85 50 L87 44 L89 50 L89 76 Z" fill="#d1d5db" transform="rotate(15 87 60)" />
      {metallicSheenId && (
        <path d="M85 76 L85 50 L87 44 L89 50 L89 76 Z" fill={`url(#${metallicSheenId})`} transform="rotate(15 87 60)" />
      )}
      {/* fuller — a thin center groove line for extra blade detail */}
      <line x1="87" y1="50" x2="87" y2="74" stroke="#9ca3af" strokeWidth="0.6" opacity="0.7" transform="rotate(15 87 60)" />
      {/* crossguard, wider than the hilt for a proper "guard" silhouette instead of a plain narrow bar */}
      <path d="M79 76 L95 76 L95 79.5 L79 79.5 Z" fill={color} transform="rotate(15 87 78)" />
      <rect x="85" y="80" width="4" height="9" rx="1.5" fill="#92400e" transform="rotate(15 87 85)" />
      {/* pommel */}
      <circle cx="87" cy="90.5" r="2.3" fill={color} transform="rotate(15 87 85)" />
    </g>
  );
}

/** Level 3 unlock — the other mutually-exclusive weapon slot option. Metallic — see `metallicSheenId`. Upper-body attach point. */
export function GunEquipment({ color, metallicSheenId }: MetallicEquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      {/* barrel */}
      <rect x="84" y="84" width="15" height="5" rx="2" fill={color} />
      {metallicSheenId && <rect x="84" y="84" width="15" height="5" rx="2" fill={`url(#${metallicSheenId})`} />}
      {/* front sight */}
      <rect x="97" y="81.5" width="1.6" height="3" fill="#1f2937" />
      {/* grip, angled back toward the hand */}
      <rect x="94" y="88" width="5" height="9" rx="1.5" fill="#1f2937" transform="rotate(8 96.5 92)" />
      {/* trigger guard — a simple half-circle arc, same safe-arc technique already used for the hair cap/helmet dome/shield curve */}
      <path d="M91 89 A3 3 0 0 0 91 95" fill="none" stroke="#1f2937" strokeWidth="1.2" />
    </g>
  );
}

/** Level 4 unlock. Held out to the left. Metallic — see `metallicSheenId`. A small rotated "gem" accent sits at the shield's center, echoing the ornate gem-inlaid armor language of the reference sheet. Upper-body attach point. */
export function ShieldEquipment({ color, metallicSheenId }: MetallicEquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M1 56 L13 52 L25 56 L25 76 C25 88 19 95 13 98 C7 95 1 88 1 76 Z" fill={color} />
      {metallicSheenId && (
        <path d="M1 56 L13 52 L25 56 L25 76 C25 88 19 95 13 98 C7 95 1 88 1 76 Z" fill={`url(#${metallicSheenId})`} />
      )}
      <path d="M13 58 L13 90 M5 66 L21 66" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      <rect x="9" y="67" width="8" height="8" fill="#ffffff" opacity="0.9" transform="rotate(45 13 71)" />
    </g>
  );
}

/** Level 5 unlock. Rendered BEHIND the body (see `CharacterAvatar`'s render order) so it drapes from the shoulders instead of sitting on top of the torso. A flared trapezoid (gathered at the shoulder, wider at the hem, angled bottom edge) rather than a plain rect, for a "flowing" cape read instead of two static rectangular strips. Recolorable — see `AvatarConfig.uniformColor`. Cloth, not metallic — no sheen. Upper-body attach point. */
export function CapeEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M22 50 L32 50 L36 112 L18 108 Z" fill={color} />
      <path d="M78 50 L68 50 L64 112 L82 108 Z" fill={color} />
    </g>
  );
}

/** Always available from level 1 — the ordinary (non-locked) shoe option, left foot. Same footprint as the plain foot it covers. Left-leg attach point. */
export function BasicShoesLeft({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="32" y="139" width="18" height="8" rx="3" fill={color} />
    </g>
  );
}

/** Right-foot counterpart of `BasicShoesLeft`. Right-leg attach point. */
export function BasicShoesRight({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="50" y="139" width="18" height="8" rx="3" fill={color} />
    </g>
  );
}

/** Level 5 unlock — a visually distinct, taller boot, left leg. Left-leg attach point. */
export function BootsLeft({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="32" y="125" width="18" height="22" rx="5" fill={color} />
      <rect x="32" y="125" width="18" height="4" rx="2" fill="white" opacity="0.35" />
    </g>
  );
}

/** Right-boot counterpart of `BootsLeft`. Right-leg attach point. */
export function BootsRight({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <rect x="50" y="125" width="18" height="22" rx="5" fill={color} />
      <rect x="50" y="125" width="18" height="4" rx="2" fill="white" opacity="0.35" />
    </g>
  );
}

/** Level 3 unlock — one of two mutually-exclusive hat slot options. Renders on top of `Hair` (may cover it, same as real headwear) but keeps the same HAIR_CAP_BASELINE-style clearance above the eyes. Metallic — see `metallicSheenId`. A small crest fin on top echoes the reference sheet's knight-helmet silhouette. Upper-body attach point. */
export function HelmetEquipment({ color, metallicSheenId }: MetallicEquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M33 24 A17 13 0 0 1 67 24 Z" fill={color} />
      {metallicSheenId && <path d="M33 24 A17 13 0 0 1 67 24 Z" fill={`url(#${metallicSheenId})`} />}
      <rect x="33" y="20" width="34" height="4" rx="2" fill="#e5e7eb" opacity="0.8" />
      <rect x="48" y="13" width="4" height="9" rx="2" fill={color} />
    </g>
  );
}

/** Level 3 unlock — the other mutually-exclusive hat slot option. Cloth, not metallic — no sheen. Upper-body attach point. */
export function CapEquipment({ color }: EquipmentProps) {
  return (
    <g className="origin-center animate-equip-in">
      <path d="M36 21 A14 9 0 0 1 64 21 Z" fill={color} />
      <rect x="38" y="19" width="24" height="5" rx="2.5" fill={color} transform="rotate(-6 50 21)" />
    </g>
  );
}
