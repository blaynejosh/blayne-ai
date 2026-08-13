import MapStage from './MapStage.jsx';
import MapStacked from './MapStacked.jsx';

/**
 * One layer of the Product Map. Carries the anchor the hero's Explore pills
 * link to, and picks the layout: the exact fan composition at desktop width,
 * a plain list below it.
 */
export default function MapSection(props) {
  return (
    <div id={props.id} className="flex w-full flex-col items-center">
      <MapStacked {...props} />
      <MapStage {...props} />
    </div>
  );
}
