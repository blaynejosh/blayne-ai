/**
 * The four entry points on the home hero.
 *
 * These are the four layers of the BLAYNE Product Map — the hero doubles as
 * the product menu, so each pill deep-links into one layer of the map.
 *
 * `label` / `pill` geometry is measured off Design/Website/Home.svg
 * (getBBox on the outlined text, and the pill rects themselves), in
 * artboard pixels on the 1440 x 1024 board.
 */
export const HERO_NODES = [
  {
    id: 'features',
    label: 'FEATURES',
    to: '/features',
    blurb: 'Twenty active capability modules, plus what is still on the roadmap.',
    labelAt: { x: 189.8, y: 350.7 },
    pill: { x: 132, y: 382 },
  },
  {
    id: 'job-roles',
    label: 'JOB ROLES',
    to: '/job-roles',
    blurb: 'What BLAYNE does for each role inside a department.',
    labelAt: { x: 460.9, y: 224.7 },
    pill: { x: 414, y: 253 },
  },
  {
    id: 'departments',
    label: 'DEPARTMENTS',
    to: '/departments',
    blurb: 'Every department of a full enterprise organisation, mapped.',
    labelAt: { x: 962.8, y: 204.7 },
    pill: { x: 943, y: 237 },
  },
  {
    id: 'startups',
    label: 'STARTUPS',
    to: '/startups',
    blurb: 'How the full structure compresses at each stage of growth.',
    labelAt: { x: 1232.8, y: 353.7 },
    pill: { x: 1175, y: 382 },
  },
];

/** Shared pill metrics, straight off the SVG rects. */
export const PILL = {
  w: 142,
  h: 40,
  padLeft: 16.44, // rect.x -> dot leading edge
  padRight: 20, // text trailing edge -> rect.x + w
  dot: 5, // node radius
  text: 15.8, // sized so Inter's ink height matches the outlined type
  tracking: '0.01em',
};
