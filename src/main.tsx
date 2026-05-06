import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TerrainMap, type Location } from './TerrainMap';
import { TEST_ROUTE } from './test-route';
import './style.css';

const LOCATIONS: Location[] = [
  // {
  //   id: 'test-flight',
  //   name: 'Recorded flight',
  //   subtitle: 'GPS log (test-route.csv)',
  //   route: {
  //     name: 'Tracked flight',
  //     waypoints: TEST_ROUTE.map(({ lat, lon, alt }, i) => ({
  //       lat,
  //       lon,
  //       alt,
  //       label:
  //         i === 0
  //           ? 'Start'
  //           : i === TEST_ROUTE.length - 1
  //             ? 'End'
  //             : undefined,
  //     })),
  //   },
  // },
  {
    id: 'babadag',
    name: 'Babadağ',
    subtitle: 'Fethiye, Türkiye',
    // lat: 36.65,
    // lon: 28.85,
    route: {
      name: 'Marmaris → Ölüdeniz',
      waypoints: [
        { lat: 36.8556, lon: 28.2733, label: 'Marmaris' },
        { lat: 36.79, lon: 28.30 },
        { lat: 36.66, lon: 28.42 },
        { lat: 36.6, lon: 28.65 },
        { lat: 36.6, lon: 28.95 },
        { lat: 36.58, lon: 29.05 },
        { lat: 36.5547, lon: 29.1149, label: 'Ölüdeniz' },
      ],
    },
  },
  {
    id: 'tbilisi-sea',
    name: 'Tbilisi Sea Hills',
    subtitle: 'Tbilisi, Georgia',
    lat: 41.76,
    lon: 44.876,
    orbitPoint: {
      lat: 41.7581148,
      lon: 44.9146116,
      label: 'GPF Paragliding Site',
    },
  },
];

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <div style={{
      width: '100vw',
      height: '100vh',
      textAlign: 'center',
      padding: '1em',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '80vw',
        height: '50vh',
        
      }
      }>
        <TerrainMap
          locations={LOCATIONS}
          controls={{
            locations: true,
            info: true,
            verticalExaggeration: true,
          }}
        />
      </div>
    </div>
  </StrictMode>,
);
