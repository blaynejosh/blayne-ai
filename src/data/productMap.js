/**
 * The four layers of the BLAYNE Product Map.
 *
 * Source: BLAYNE_Product_Map.docx (Prepared August 2026) — sections 1-4.
 * The Features list is the 20 modules drawn in Design/Website/Features page.svg,
 * in the same bottom-to-top order the export uses (F1 at the bottom); the array
 * below reads top-to-bottom, so it is that list reversed.
 *
 * Roadmap gaps (F10, F21, F22, F24, F25) are deliberately not listed here —
 * the export shows only what is active or partial today.
 */

export const FEATURES = [
  'Country / Market-Entry Risk Intelligence',
  'Multi-Format Document Production',
  'Visual & Presentation Design',
  'Executive Communication & Editorial Polish',
  'Proposal & SOW Generation',
  'SOP & Technical Documentation Suite',
  'Report & Long-Form Document Generation',
  'Template Replication Engine',
  'Regulatory & Compliance Intelligence',
  'Digital Transformation Advisory',
  'Technology & Architecture Advisory',
  'Investor & Fundraising Narrative',
  'Sales Enablement Engine',
  'Market & Positioning Engine',
  'Market & Competitive Intelligence',
  'UX Research Suite',
  'Product Management Suite',
  'Client Engagement',
  'Strategic Consulting Engine',
  'Brand & Identity System',
];

/** Section 2 — twelve departments of a fully staffed enterprise. */
export const DEPARTMENTS = [
  'Executive Leadership',
  'Corporate Strategy & Business Development',
  'Finance',
  'Legal & Compliance',
  'Human Resources',
  'Marketing',
  'Sales',
  'Product Management',
  'Engineering & Technology',
  'Operations',
  'Customer Success & Support',
  'Investor Relations / Fundraising',
];

/**
 * Section 3 — thirty-six roles, three per department, in department order.
 * Naming follows the product sidebar in "AI chat area - Job Roles.svg".
 */
export const JOB_ROLES = [
  'CEO/Founder',
  'COO',
  'Chief of Staff',
  'Head of Strategy',
  'BD Manager',
  'Strategy / Business Analyst',
  'CFO',
  'FP&A Manager',
  'Controller / Accounting Lead',
  'General Counsel',
  'Compliance Officer',
  'Regulatory Affairs Manager',
  'VP People / CHRO',
  'HR Business Partner',
  'Talent Acquisition Lead',
  'CMO / VP Marketing',
  'Product Marketing Manager',
  'Content / Brand Manager',
  'VP Sales / Head of Sales',
  'Account Executive',
  'Sales Enablement Manager',
  'CPO / VP Product',
  'Product Manager',
  'UX Researcher',
  'CTO',
  'Solutions Architect',
  'Engineering Manager',
  'VP Operations',
  'Operations Manager',
  'Program / Project Manager',
  'VP Customer Success',
  'CS Manager',
  'Support Lead',
  'Head of IR',
  'Founder (fundraising hat)',
  'IR Analyst',
];

/**
 * Section 4 — how the twelve-department structure compresses by stage.
 * Each stage carries its headcount, so these render as two-line items and
 * get roughly double the usual row spacing.
 */
export const STARTUP_STAGES = [
  { label: 'Pre-seed / Idea', meta: '1-3 · founders only' },
  { label: 'Seed', meta: '4-15 · roles combine' },
  { label: 'Series A', meta: '15-50 · leads emerge' },
  { label: 'Series B+ / Growth', meta: '50-200+ · department heads' },
  { label: 'Enterprise', meta: '200+ · all 12 departments' },
];

/**
 * Section order on the home page, matching the left-to-right order of the
 * hero's four entry points. `id` doubles as the anchor the hero links to.
 */
export const MAP_SECTIONS = [
  {
    id: 'features',
    title: 'FEATURES',
    intro: 'Twenty active capability modules, plus what is still on the roadmap.',
    items: FEATURES,
  },
  {
    id: 'job-roles',
    title: 'JOB ROLES',
    intro: 'Thirty-six roles across twelve departments, three in each.',
    items: JOB_ROLES,
  },
  {
    id: 'departments',
    title: 'DEPARTMENTS',
    intro: 'Every department of a full enterprise organisation, mapped.',
    items: DEPARTMENTS,
  },
  {
    id: 'startups',
    title: 'START UPS',
    intro: 'How the full structure compresses at each stage of growth.',
    items: STARTUP_STAGES,
    spacing: 86,
  },
];
