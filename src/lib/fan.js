/**
 * The fan of curves in "Features page.svg" — regenerated for any item count.
 *
 * The export only contains a 20-item fan, drawn by hand. Each strand there is
 * two cubics: it leaves the label horizontally, turns to run vertically at a
 * mid point, then flattens back out into the bundle at the trunk. Strands
 * whose label sits far from the trunk turn earlier and run deeper into the
 * bundle, which is what gives the rope its taper.
 *
 * Fitting that structure against the original paths gives the ratios below;
 * they reproduce the hand-drawn curves to within a couple of px, and let a
 * section with 12 or 36 items keep the same shape.
 */

/** Where the bundle gathers. Item baselines are centred on this line. */
export const TRUNK_Y = 571;

/** Baselines in the export run 165..982 — centred on 573.5, 43px apart. */
export const COLUMN = {
  centerY: 573.5,
  spacing: 43,
  /** Item text starts here; strands meet the column at RAIL.main. */
  textX: 926,
  /** Keeps a tall column inside the artboard. */
  band: 830,
};

/**
 * Shape constants, as [value when the strand is nearest the trunk,
 * value when it is furthest]. Fitted against the export.
 */
const RAIL = {
  main: { railX: 887, xMid: [850, 778], end: [776, 556], handle: [12.3, 36.5] },
  wisp: { railX: 543, xMid: [547.6, 555.4], end: [557, 581], handle: [1.5, 4.2] },
};

/** Shared curve ratios — identical for the main strands and the wisps. */
const R = {
  yMid: 0.573, // how far down toward the trunk the vertical run starts
  lead: 0.0066, // droop on the handle leaving the rail
  turn: 0.13, // where the strand starts bending off the rail
  over: 1.036, // slight overshoot past the trunk line
  gather: 0.34, // handle length along the bundle
};

const lerp = (a, b, t) => a + (b - a) * t;
const n = (v) => Math.round(v * 100) / 100;

/**
 * One strand, from its rail (the label column, or the frayed tail on the far
 * side) into the trunk. `t` is 0 for a strand level with the trunk and 1 for
 * the outermost one.
 */
function strand(cfg, y, t) {
  const { railX } = cfg;
  const dy = TRUNK_Y - y;
  const xMid = lerp(cfg.xMid[0], cfg.xMid[1], t);
  const endX = lerp(cfg.end[0], cfg.end[1], t);
  const yMid = y + R.yMid * dy;
  const dir = Math.sign(endX - railX); // travel direction along x
  const h = lerp(cfg.handle[0], cfg.handle[1], t);

  return (
    `M${n(railX)} ${n(y)}` +
    `C${n(railX + dir * h)} ${n(y + R.lead * dy)}` +
    ` ${n(xMid + dir * 0.9)} ${n(y + R.turn * dy)}` +
    ` ${n(xMid)} ${n(yMid)}` +
    `C${n(xMid - dir * 0.9)} ${n(yMid + R.over * (TRUNK_Y - yMid))}` +
    ` ${n(endX + R.gather * (xMid - endX))} ${n(TRUNK_Y)}` +
    ` ${n(endX)} ${n(TRUNK_Y)}`
  );
}

/** Baseline y for each item, centred on the trunk. */
export function baselines(count, spacing = COLUMN.spacing) {
  const s = Math.min(spacing, COLUMN.band / Math.max(count - 1, 1));
  const top = COLUMN.centerY - ((count - 1) * s) / 2;
  return Array.from({ length: count }, (_, i) => ({ y: top + i * s, spacing: s }));
}

/** One strand per item, drawn from the label column into the bundle. */
export function strands(ys) {
  const max = Math.max(...ys.map((y) => Math.abs(TRUNK_Y - y)), 1);
  return ys.map((y) => strand(RAIL.main, y, Math.abs(TRUNK_Y - y) / max));
}

/**
 * The frayed tail on the far side of the trunk. Purely decorative — the
 * export draws nine per side, spanning about 63px.
 */
export function wisps(perSide = 9, reach = 63) {
  const out = [];
  for (let i = 1; i <= perSide; i += 1) {
    const t = i / perSide;
    const offset = reach * t;
    out.push(strand(RAIL.wisp, TRUNK_Y - offset, t));
    out.push(strand(RAIL.wisp, TRUNK_Y + offset, t));
  }
  return out;
}
