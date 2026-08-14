/**
 * Uploads the Blayne skill set to the Anthropic Skills API so the web chat can
 * use it, and records the returned ids in server/skills.json.
 *
 *   npm run skills:upload            upload anything not already recorded
 *   npm run skills:upload -- --force re-upload everything as a new version
 *   npm run skills:upload -- --only blayne-methodology
 *   npm run skills:list              show what is recorded
 *
 * Source skills live in the Claude skills plugin directory. Point SKILLS_DIR at
 * it (see .env.example) — the default below is this machine's path.
 *
 * Why a script and not a build step: skills are account-level resources with
 * their own versioning. Upload once, commit the ids, reuse them on every
 * request. Re-run only when a SKILL.md actually changes.
 */
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(root, 'server', 'skills.json');

const SKILLS_DIR =
  process.env.SKILLS_DIR ??
  path.join(
    process.env.LOCALAPPDATA ?? '',
    'Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude',
    'local-agent-mode-sessions/skills-plugin',
    'e97b0445-9aeb-436a-ac44-ca684e72a1fe/43a9f4d1-ca70-44f9-add5-a3114badff86/skills',
  );

/**
 * The Messages API caps a request at 20 skills, and the Blayne AI Knowledge
 * Repository indexes more than that. This is the consulting core: all six
 * Blayne-specific skills, plus the specialists the `bbip` router points at for
 * the Active categories.
 *
 * Deliberately left out (document-production and visual-design skills, which
 * the chat surface cannot use because it renders Markdown, not files):
 *   brand-designer, template-cloner, editor, proofreader,
 *   visual-document-designer, information-designer, infographic-designer,
 *   presentation-designer, image-designer
 * Add them here — and drop others — when the chat can produce documents.
 */
export const SKILL_SET = [
  // Blayne-specific — the house voice, method, and brand
  'bbip',
  'blayne-methodology',
  'blayne-brand-guidelines',
  'blayne-executive-writing-standard',
  'blayne-investor-writing-style',
  'blayne-document-formatter',
  // Specialists behind the Repository's Active categories
  'business-consultant',
  'market-research',
  'proposal-writer',
  'report-writer',
  'product-manager',
  'ux-research',
  'product-marketing',
  'storytelling',
  'sales-consultant',
  'investor-relations',
  'solutions-architect',
  'regulatory-research',
  'technical-writer',
  'executive-communication',
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

const readRegistry = () => {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  } catch {
    return {};
  }
};

if (args.includes('--list')) {
  const reg = readRegistry();
  const rows = Object.entries(reg);
  if (!rows.length) console.log('No skills recorded yet. Run: npm run skills:upload');
  for (const [name, v] of rows) {
    console.log(`${name.padEnd(36)} ${v.skill_id}  v${v.version}`);
  }
  process.exit(0);
}

if (!fs.existsSync(SKILLS_DIR)) {
  console.error(`Skills directory not found:\n  ${SKILLS_DIR}\nSet SKILLS_DIR in .env.`);
  process.exit(1);
}

const client = new Anthropic();
const registry = readRegistry();
const targets = only ? [only] : SKILL_SET;

let uploaded = 0;
let skipped = 0;

for (const name of targets) {
  const dir = path.join(SKILLS_DIR, name);
  const mdPath = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(mdPath)) {
    console.warn(`  skip  ${name.padEnd(34)} no SKILL.md at ${dir}`);
    continue;
  }

  if (registry[name] && !force) {
    console.log(`  have  ${name.padEnd(34)} ${registry[name].skill_id}`);
    skipped += 1;
    continue;
  }

  // Every file in the upload must sit under one top-level directory whose root
  // holds SKILL.md. These skills are single-file, so that is just the one entry.
  const files = [
    await toFile(fs.readFileSync(mdPath), `${name}/SKILL.md`, { type: 'text/markdown' }),
  ];

  try {
    if (registry[name] && force) {
      const version = await client.beta.skills.versions.create(registry[name].skill_id, {
        files,
        betas: ['skills-2025-10-02'],
      });
      registry[name] = { skill_id: registry[name].skill_id, version: version.version };
      console.log(`  bump  ${name.padEnd(34)} ${registry[name].skill_id} -> v${version.version}`);
    } else {
      const skill = await client.beta.skills.create({
        display_title: name,
        files,
        betas: ['skills-2025-10-02'],
      });
      const version = skill.latest_version?.version ?? skill.version ?? 1;
      registry[name] = { skill_id: skill.id, version };
      console.log(`  new   ${name.padEnd(34)} ${skill.id}  v${version}`);
    }
    uploaded += 1;
  } catch (err) {
    console.error(`  FAIL  ${name.padEnd(34)} ${err?.status ?? ''} ${err?.message ?? err}`);
  }
}

fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
fs.writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);

console.log(
  `\n${uploaded} uploaded, ${skipped} already present. Registry: ${path.relative(root, REGISTRY)}`,
);
