import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const IWATE_BOUNDS: mapboxgl.LngLatBoundsLike = [
    [140.65, 38.7],
    [142.15, 40.55],
];

type Phase = 'title' | 'placement' | 'handoff' | 'guessing' | 'result';

export default function App() {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const mapLoadedRef = useRef(false);

    const [phase, setPhase] = useState<Phase>('title');
    const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
    const [nippleMunicipalities, setNippleMunicipalities] = useState<string[]>([]);
    const [exploredMunicipalities, setExploredMunicipalities] = useState<string[]>([]);
    const [turnCount, setTurnCount] = useState(1);
    const [guessesThisTurn, setGuessesThisTurn] = useState(0);

    const phaseRef = useRef<Phase>(phase);
    const nippleMunicipalitiesRef = useRef<string[]>([]);
    const exploredMunicipalitiesRef = useRef<string[]>([]);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
        nippleMunicipalitiesRef.current = nippleMunicipalities;
    }, [nippleMunicipalities]);

    useEffect(() => {
        exploredMunicipalitiesRef.current = exploredMunicipalities;
    }, [exploredMunicipalities]);

    const resetGame = () => {
        setNippleMunicipalities([]);
        setExploredMunicipalities([]);
        setSelectedMunicipality(null);
        setTurnCount(1);
        setGuessesThisTurn(0);
        setPhase('title');
    };

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
                data: `${import.meta.env.BASE_URL}N03-21_03_210101.json`,
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

            // 探索済み（ハズレ・当たり問わず選んだ市区町村）
            map.addLayer({
                id: 'explored-municipalities',
                type: 'fill',
                source: 'iwate',
                filter: ['in', ['get', 'N03_007'], ['literal', []]],
                paint: {
                    'fill-color': '#9e9e9e',
                    'fill-opacity': 0.6,
                },
            });

            // 選択中の市区町村（確定前の仮選択。確定済みのピンクとは別色にする）
            map.addLayer({
                id: 'selected-municipality',
                type: 'fill',
                source: 'iwate',
                filter: ['==', ['get', 'N03_007'], ''],
                paint: {
                    'fill-color': '#ff9800',
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

                if (phaseRef.current === 'placement') {
                    // 配置済みの市区町村は選び直せない
                    if (nippleMunicipalitiesRef.current.includes(municipalityCode)) return;

                    setSelectedMunicipality(municipalityCode);
                    return;
                }

                if (phaseRef.current === 'guessing') {
                    // 探索済みの市区町村は選び直せない
                    if (exploredMunicipalitiesRef.current.includes(municipalityCode)) return;

                    const nextExplored = [...exploredMunicipalitiesRef.current, municipalityCode];

                    setExploredMunicipalities(nextExplored);

                    // 乳首を2箇所とも見つけたらクリア
                    const foundAll = nippleMunicipalitiesRef.current.every((code) =>
                        nextExplored.includes(code),
                    );

                    if (foundAll) {
                        setPhase('result');
                        return;
                    }

                    setGuessesThisTurn((prev) => {
                        if (prev >= 1) {
                            setTurnCount((turn) => turn + 1);
                            return 0;
                        }

                        return prev + 1;
                    });
                }
            });

            mapLoadedRef.current = true;
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
            mapLoadedRef.current = false;
        };
    }, []);

    // 選択された市区町村が変わったらハイライトを更新
    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapLoadedRef.current) return;

        map.setFilter('selected-municipality', [
            '==',
            ['get', 'N03_007'],
            selectedMunicipality ?? '',
        ]);
    }, [selectedMunicipality]);

    // 配置済みの市区町村が変わったらハイライトを更新
    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapLoadedRef.current) return;

        map.setFilter('placed-municipalities', [
            'in',
            ['get', 'N03_007'],
            ['literal', nippleMunicipalities],
        ]);
    }, [nippleMunicipalities]);

    // 探索済みの市区町村が変わったらハイライトを更新
    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapLoadedRef.current) return;

        map.setFilter('explored-municipalities', [
            'in',
            ['get', 'N03_007'],
            ['literal', exploredMunicipalities],
        ]);
    }, [exploredMunicipalities]);

    // 乳首の場所は配置フェーズと結果表示以外では隠す（探索側に見えないように）
    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapLoadedRef.current) return;

        const visibility = phase === 'placement' || phase === 'result' ? 'visible' : 'none';

        map.setLayoutProperty('placed-municipalities', 'visibility', visibility);
    }, [phase]);

    return (
        <>
            {phase === 'title' && (
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
                    <h1>県乳</h1>
                    <button type="button" onClick={() => setPhase('placement')}>
                        はじめる
                    </button>
                </div>
            )}

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

            {phase === 'guessing' && (
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
                    <div>ターン: {turnCount}</div>
                    <div>このターンの探索: {guessesThisTurn}/2</div>
                    <div>探索済み: {exploredMunicipalities.length}箇所</div>
                    <div>
                        発見:{' '}
                        {
                            nippleMunicipalities.filter((code) =>
                                exploredMunicipalities.includes(code),
                            ).length
                        }
                        /2
                    </div>
                </div>
            )}

            {phase === 'result' && (
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
                    <div>乳首発見！</div>
                    <button type="button" onClick={resetGame}>
                        スタート画面へ
                    </button>
                </div>
            )}

            <div
                ref={containerRef}
                style={{
                    width: '100vw',
                    height: '100vh',
                    visibility: phase === 'handoff' || phase === 'title' ? 'hidden' : 'visible',
                }}
            />
        </>
    );
}
