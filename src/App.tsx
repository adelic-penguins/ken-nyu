import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const IWATE_BOUNDS: mapboxgl.LngLatBoundsLike = [
    [140.65, 38.7],
    [142.15, 40.55],
];

type Phase = 'placement' | 'handoff' | 'guessing' | 'result';

export default function App() {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const [phase, setPhase] = useState<Phase>('placement');
    const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
    const [nippleMunicipalities, setNippleMunicipalities] = useState<string[]>([]);

    const nippleMunicipalitiesRef = useRef<string[]>([]);

    useEffect(() => {
        nippleMunicipalitiesRef.current = nippleMunicipalities;
    }, [nippleMunicipalities]);

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
        });

        mapRef.current = map;

        map.on('load', () => {
            map.addSource('iwate', {
                type: 'geojson',
                data: '/N03-21_03_210101.json',
            });

            // 岩手県全体
            map.addLayer({
                id: 'iwate-fill',
                type: 'fill',
                source: 'iwate',
                paint: {
                    'fill-opacity': 0.3,
                },
            });

            // 配置済み（乳首を置いた市区町村。ずっと残す）
            map.addLayer({
                id: 'placed-municipalities',
                type: 'fill',
                source: 'iwate',
                filter: ['in', ['get', 'N03_007'], ['literal', []]],
                paint: {
                    'fill-color': '#ff4081',
                    'fill-opacity': 0.7,
                },
            });

            // 選択中の市区町村
            map.addLayer({
                id: 'selected-municipality',
                type: 'fill',
                source: 'iwate',
                filter: ['==', ['get', 'N03_007'], ''],
                paint: {
                    'fill-color': '#ff4081',
                    'fill-opacity': 0.7,
                },
            });

            // 境界線
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

                if (!feature) return;

                const municipalityCode = feature.properties?.N03_007;

                if (!municipalityCode) return;

                // 配置済みの市区町村は選び直せない
                if (nippleMunicipalitiesRef.current.includes(municipalityCode)) return;

                setSelectedMunicipality(municipalityCode);
            });
        });

        // ゲーム盤なので地図操作は禁止
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.boxZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoomRotate.disable();
        map.keyboard.disable();
        map.dragRotate.disable();

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // 選択された市区町村が変わったらハイライトを更新
    useEffect(() => {
        const map = mapRef.current;

        if (!map?.isStyleLoaded() || !selectedMunicipality) return;

        map.setFilter('selected-municipality', ['==', ['get', 'N03_007'], selectedMunicipality]);
    }, [selectedMunicipality]);

    // 配置済みの市区町村が変わったらハイライトを更新
    useEffect(() => {
        const map = mapRef.current;

        if (!map?.isStyleLoaded()) return;

        map.setFilter('placed-municipalities', [
            'in',
            ['get', 'N03_007'],
            ['literal', nippleMunicipalities],
        ]);
    }, [nippleMunicipalities]);

    return (
        <>
            {phase === 'placement' && (
                <div
                    style={{
                        position: 'fixed',
                        top: 10,
                        left: 10,
                        zIndex: 1,
                        background: 'white',
                        padding: 12,
                    }}
                >
                    <div>選択中: {selectedMunicipality ?? 'なし'}</div>

                    <button
                        type="button"
                        disabled={!selectedMunicipality}
                        onClick={() => {
                            if (!selectedMunicipality) return;

                            setNippleMunicipalities((prev) => {
                                const next = [...prev, selectedMunicipality];

                                if (next.length >= 2) {
                                    setPhase('handoff');
                                }

                                return next;
                            });
                            setSelectedMunicipality(null);
                        }}
                    >
                        ここに乳首を配置
                    </button>

                    <div>
                        配置済み: {nippleMunicipalities.length}/2
                        {nippleMunicipalities.length > 0 && ` (${nippleMunicipalities.join(', ')})`}
                    </div>
                </div>
            )}

            {phase === 'handoff' && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        background: 'white',
                    }}
                >
                    <div>次のプレイヤーに端末を渡してください</div>
                    <button type="button" onClick={() => setPhase('guessing')}>
                        準備OK
                    </button>
                </div>
            )}

            <div
                ref={containerRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                    visibility: phase === 'handoff' ? 'hidden' : 'visible',
                }}
            />
        </>
    );
}
