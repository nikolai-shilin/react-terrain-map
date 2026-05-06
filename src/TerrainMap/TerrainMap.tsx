import { useCallback, useEffect, useRef, useState } from 'react';
import { HUD, VEX } from './config';
import { createTerrainScene } from './scene';
import type {
  Location,
  TerrainMapControls,
  TerrainMapProps,
  TerrainSceneApi,
} from './types';
import './styles.css';

const ALL_CONTROLS: Required<TerrainMapControls> = {
  locations: true,
  verticalExaggeration: true,
  info: true,
};
const NO_CONTROLS: Required<TerrainMapControls> = {
  locations: false,
  verticalExaggeration: false,
  info: false,
};

function resolveControls(
  controls: TerrainMapProps['controls'],
): Required<TerrainMapControls> {
  if (controls === false) return NO_CONTROLS;
  if (controls === true || controls === undefined) return ALL_CONTROLS;
  return {
    locations: controls.locations ?? true,
    verticalExaggeration: controls.verticalExaggeration ?? true,
    info: controls.info ?? true,
  };
}

/**
 * 3D terrain viewer. Loads elevation + satellite imagery for each location
 * on demand and renders an interactive map with optional floating controls.
 *
 * The component takes its size from the `className` (or any inline styles
 * on the rendered root element); the canvas inside fills 100 % of that box.
 * The root has `position: relative` so HUD overlays anchor to the map.
 */
export function TerrainMap({
  className,
  locations,
  initialLocationId,
  controls,
}: TerrainMapProps) {
  const showControls = resolveControls(controls);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<TerrainSceneApi | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [vex, setVex] = useState<number>(VEX.default);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // Initialise the Three.js scene exactly once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const api = createTerrainScene(container, { onStatus: setStatus });
    apiRef.current = api;

    if (locations.length > 0) {
      const initial =
        locations.find((l) => l.id === initialLocationId) ?? locations[0];
      setBusy(true);
      api.switchTo(initial)
        .then(() => setActiveId(initial.id))
        .catch(() => {})
        .finally(() => setBusy(false));
    }

    return () => {
      api.dispose();
      apiRef.current = null;
    };
    // We intentionally only run this once. Subsequent location/vex changes
    // are pushed into the imperative API via the handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push vex changes through to the scene whenever the slider moves.
  useEffect(() => {
    apiRef.current?.applyVex(vex);
  }, [vex]);

  const handleSwitch = useCallback(
    async (loc: Location) => {
      if (busy || loc.id === activeId || !apiRef.current) return;
      setBusy(true);
      try {
        await apiRef.current.switchTo(loc);
        setActiveId(loc.id);
      } catch {
        // status message already set by the scene's onStatus callback
      } finally {
        setBusy(false);
      }
    },
    [busy, activeId],
  );

  const active = locations.find((l) => l.id === activeId);
  const rootClass = ['terrain-map', className].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className={rootClass}>
      {status && <div className="terrain-map__status">{status}</div>}

      {showControls.locations && locations.length > 1 && (
        <div className="terrain-map__locations">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className={loc.id === activeId ? 'is-active' : undefined}
              disabled={busy}
              onClick={() => handleSwitch(loc)}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}

      {showControls.info && (
        <div className="terrain-map__hud">
          {active ? (
            <>
              <strong>{active.name}</strong> · <span>{active.subtitle}</span>
              {active.route && <span> · {active.route.name}</span>}
              <br />
              {HUD.mouseHint}
              <br />
              {HUD.keyHint}
              <br />
              <span className="terrain-map__muted">{HUD.attribution}</span>
            </>
          ) : (
            <span className="terrain-map__muted">No location selected.</span>
          )}
        </div>
      )}

      {showControls.verticalExaggeration && (
        <div className="terrain-map__vex">
          <label>
            Vertical exaggeration{' '}
            <span>{vex.toFixed(1)}×</span>
          </label>
          <input
            type="range"
            min={VEX.min}
            max={VEX.max}
            step={VEX.step}
            value={vex}
            onChange={(e) => setVex(parseFloat(e.target.value))}
          />
        </div>
      )}
    </div>
  );
}
