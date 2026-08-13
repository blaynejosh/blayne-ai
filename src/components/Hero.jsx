import HeroStage from './HeroStage.jsx';
import HeroStacked from './HeroStacked.jsx';

/**
 * Home hero — two layouts of the same content. HeroStage reproduces Home.svg
 * exactly on its native 1440 x 1024 artboard; HeroStacked reflows it to one
 * column on narrow viewports.
 */
export default function Hero() {
  return (
    <div id="top" className="flex w-full flex-col items-center">
      <HeroStacked />
      <HeroStage />
    </div>
  );
}
