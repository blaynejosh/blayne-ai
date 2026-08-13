import { Link } from 'react-router-dom';
import MapBackdrop from './MapBackdrop.jsx';
import { u, ink } from '../lib/stage.js';
import { baselines, strands, wisps, COLUMN } from '../lib/fan.js';

/*
 * Type sized so Inter's ink matches the outlined text in Features page.svg:
 * the title's caps measure 17.1px tall, the item rows 12px to the ascender.
 */
const TITLE = { size: 22.6, tracking: '0.06em', at: { x: 691.7, y: 137.1 } };

/*
 * The export's face is wider than Inter at the same height, so item size is
 * set from the ink height (12px to the ascender) and tracking makes up the
 * width. `ascent` converts a row's baseline into the ink top ink() expects.
 */
const ITEM = { size: 15.5, ascent: 12, tracking: '0.048em' };

/**
 * One layer of the Product Map, laid out exactly as Design/Website/Features
 * page.svg draws it: the node cluster and ambient wash on the left, a bundle
 * of curves fanning out to a column of item names on the right.
 *
 * The export only contains the 20-item Features fan, so the curves are
 * regenerated from its geometry (see lib/fan.js) and the column is recentred
 * on the trunk — which is what lets Departments (12), Job Roles (36) and
 * Start Ups (5) reuse the same composition.
 */
export default function MapStage({ id, title, items, spacing }) {
  const rows = baselines(items.length, spacing ?? COLUMN.spacing);
  const paths = strands(rows.map((r) => r.y));
  const tail = wisps();

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="stage hidden shrink-0 md:block"
    >
      <MapBackdrop className="absolute inset-0 h-full w-full" />

      {/* The fan: one strand per item, plus the frayed tail past the trunk. */}
      <svg
        viewBox="0 0 1440 1024"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 h-full w-full"
      >
        <g stroke="white" strokeWidth="1" fill="none">
          {paths.map((d) => (
            <path key={d} d={d} />
          ))}
          <g opacity="0.8">
            {tail.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </g>
      </svg>

      <h2
        id={`${id}-title`}
        style={{ ...ink(TITLE.at.x, TITLE.at.y, TITLE.size), letterSpacing: TITLE.tracking }}
        className="absolute m-0 leading-none font-normal whitespace-nowrap text-platinum"
      >
        {title}
      </h2>

      <Link
        to={`/${id}`}
        style={ink(TITLE.at.x, 176, ITEM.size, 'mixed')}
        className="group absolute whitespace-nowrap text-platinum/65 no-underline transition-colors hover:text-platinum focus-visible:ring-2 focus-visible:ring-jordy focus-visible:outline-none"
      >
        Open in BLAYNE{' '}
        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">
          &rarr;
        </span>
      </Link>

      <ul className="absolute inset-0 m-0 list-none p-0">
        {items.map((item, i) => {
          const label = typeof item === 'string' ? item : item.label;
          const meta = typeof item === 'string' ? null : item.meta;
          // Rows sit on a baseline; ink() wants the ink top of the line.
          const top = rows[i].y - ITEM.ascent;
          return (
            <li
              key={label}
              style={{
                ...ink(COLUMN.textX, top, ITEM.size, 'mixed'),
                letterSpacing: ITEM.tracking,
                position: 'absolute',
              }}
              className="leading-none whitespace-nowrap text-platinum"
            >
              {label}
              {meta && (
                <span
                  style={{ fontSize: u(ITEM.size * 0.8) }}
                  className="mt-[0.35em] block text-platinum/55"
                >
                  {meta}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
