import { Link } from 'react-router-dom';
import MapBackdrop from './MapBackdrop.jsx';

/**
 * Narrow-viewport version of a Product Map layer.
 *
 * The fan only reads at desktop width — at 375px the strands collapse into a
 * smudge and a 36-row column runs off the artboard. So the curves are dropped
 * and the same items become a plain indexed list, with the node cluster left
 * behind the copy as an ambient wash.
 */
export default function MapStacked({ id, title, intro, items }) {
  return (
    <section
      aria-labelledby={`${id}-title-sm`}
      className="relative w-full overflow-hidden bg-delft px-6 py-14 md:hidden"
    >
      <MapBackdrop
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-delft/75" />

      <div className="relative">
        <h2
          id={`${id}-title-sm`}
          className="m-0 text-xl font-normal tracking-[0.055em] text-platinum"
        >
          {title}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-platinum/70">{intro}</p>

        <Link
          to={`/${id}`}
          className="pressable mt-5 inline-flex items-center gap-2 rounded-full bg-jordy/15 px-4 py-2 text-sm text-platinum no-underline transition-colors hover:bg-jordy/25 focus-visible:ring-2 focus-visible:ring-jordy focus-visible:outline-none"
        >
          Open in BLAYNE
          <span aria-hidden="true">&rarr;</span>
        </Link>

        <ul className="mt-8 flex list-none flex-col gap-px p-0">
          {items.map((item, i) => {
            const label = typeof item === 'string' ? item : item.label;
            const meta = typeof item === 'string' ? null : item.meta;
            return (
              <li
                key={label}
                className="flex items-baseline gap-3 border-b border-jordy/10 py-2.5 last:border-0"
              >
                <span className="w-6 shrink-0 text-xs text-platinum/40 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-platinum">{label}</span>
                  {meta && (
                    <span className="mt-0.5 block text-xs text-platinum/55">{meta}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
