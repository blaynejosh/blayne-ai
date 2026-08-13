/**
 * Home.svg is authored on a 1440 x 1024 artboard. `.stage` reproduces that
 * artboard as a size container, so 1% of its width === 14.4 design px.
 *
 * u(n) converts a raw design-pixel measurement taken off the SVG into a
 * container-query length. Because the stage keeps a fixed aspect ratio,
 * cqw works for vertical measurements too — one unit everywhere.
 */
export const ARTBOARD = { w: 1440, h: 1024 };

export const u = (px) => `${((px * 100) / ARTBOARD.w).toFixed(4)}cqw`;

/** Absolute box positioned by its top-left corner in design pixels. */
export const box = (x, y, w, h) => ({
  left: u(x),
  top: u(y),
  ...(w != null && { width: u(w) }),
  ...(h != null && { height: u(h) }),
});

/**
 * All type in Home.svg is outlined, so every text measurement taken off it is
 * an ink (glyph) box. CSS instead positions the line box, which sits slightly
 * above the ink by the font's half-leading plus the ascent-to-cap gap.
 *
 * INK_TOP is that gap as a fraction of font-size, measured against Inter at
 * line-height: 1 — it scales with font-size, so one ratio covers every size.
 * `caps` is for all-uppercase runs, `mixed` for sentence-case runs whose
 * tallest glyph is an ascender rather than a cap.
 */
export const INK_TOP = { caps: 0.1225, mixed: 0.0855 };

/**
 * Position a single line of text so its *ink* box lands on the (x, y) taken
 * from the SVG, at the given design-pixel font size.
 */
export const ink = (x, y, fontPx, variant = 'caps') => ({
  left: u(x),
  top: u(y - fontPx * INK_TOP[variant]),
  fontSize: u(fontPx),
});
