import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const IWATE_BOUNDS: mapboxgl.LngLatBoundsLike = [
    [140.6, 38.7], // southwest
    [142.1, 40.5], // northeast
];

export default function App() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
            style: 'mapbox://styles/mapbox/standard',
            bounds: IWATE_BOUNDS,
            fitBoundsOptions: {
                padding: 30,
            },
            maxBounds: IWATE_BOUNDS,
        });

        map.on('load', () => {
            map.addSource('iwate', {
                type: 'geojson',
                data: '/N03-21_03_210101.json',
            });

            map.addLayer({
                id: 'iwate-fill',
                type: 'fill',
                source: 'iwate',
                paint: {
                    'fill-opacity': 0.3,
                },
            });

            map.addLayer({
                id: 'iwate-border',
                type: 'line',
                source: 'iwate',
                paint: {
                    'line-width': 2,
                },
            });

            map.on('click', 'iwate-fill', (e) => {
                const feature = e.features?.[0];

                console.log(feature);
            });
        });

        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        return () => map.remove();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100vw',
                height: '100vh',
            }}
        />
    );
}
