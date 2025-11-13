import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Coordinates, LocationInfo, WeatherInfo, AstroEvent, CelestialBodyDetails, Language, LoadingState, ScreenPosition, Star, Page, EducationTopic, EducationContent, QuizQuestion } from './types';
import { translations } from './i18n/translations';
import { fetchInitialData, fetchCelestialBodyInfo, generateCelestialBodyImage, fetchEducationContent, fetchQuizQuestions } from './services/geminiService';
import { LocationIcon, WeatherIcon, CalendarIcon, CloseIcon, GlobeIcon, PlayIcon, PauseIcon, NowIcon } from './components/icons';
import { calculateObjectPosition, getSkyColor, projectToScreen } from './utils/astro';
import { STARS, BRIGHTEST_STARS } from './data/stars';
import { CONSTELLATIONS } from './data/constellations';
import { CELESTIAL_BODIES } from './data/celestialBodies';

// --- DATA ---
const EDUCATION_TOPICS: EducationTopic[] = [
    { id: 'solar-system', titleKey: 'solarSystem', summaryKey: 'solarSystem', icon: '🪐' },
    { id: 'stars-galaxies', titleKey: 'starsAndGalaxies', summaryKey: 'starsAndGalaxies', icon: '✨' },
    { id: 'space-exploration', titleKey: 'spaceExploration', summaryKey: 'spaceExploration', icon: '🚀' },
];

// --- SHARED SUB-COMPONENTS ---

const LanguageSelector: React.FC<{ lang: Language; setLang: (lang: Language) => void, className?: string }> = ({ lang, setLang, className }) => {
    const languages: { code: Language; name: string }[] = [
        { code: 'fr', name: 'Français' }, { code: 'en', name: 'English' }, { code: 'es', name: 'Español' },
        { code: 'de', name: 'Deutsch' }, { code: 'ar', name: 'العربية' }, { code: 'zh', name: '中文' },
    ];
    return (
        <div className={`relative ${className}`}>
            <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 pointer-events-none" />
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="pl-10 pr-4 py-2 bg-black/30 text-white border border-white/20 rounded-lg backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 appearance-none" aria-label="Select language">
                {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
        </div>
    );
};

const PageContainer: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => (
    <div className="w-full h-full bg-gradient-to-b from-black via-indigo-900 to-black text-white p-4 pt-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-cyan-300 mb-8 text-center">{title}</h1>
            {children}
        </div>
    </div>
);

// --- OBSERVATORY COMPONENTS ---

const TimeController: React.FC<{
    simTime: Date, setSimTime: (d: Date) => void, isPlaying: boolean, setIsPlaying: (p: boolean) => void, lang: Language,
    location: LocationInfo | null, weather: WeatherInfo | null, events: AstroEvent[] | null,
    loading: LoadingState, errors: { [key:string]: string | null }
}> = (props) => {
    const { simTime, setSimTime, isPlaying, setIsPlaying, lang, location, weather, events, loading, errors } = props;
    const [activeInfoPanel, setActiveInfoPanel] = useState<'location' | 'weather' | 'events' | null>(null);
    const t = (key: keyof typeof translations.ui) => translations.ui[key][lang];

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(simTime);
        newDate.setHours(Math.floor(parseInt(e.target.value)/60), parseInt(e.target.value)%60);
        setSimTime(newDate);
    };
    const timeValue = simTime.getHours() * 60 + simTime.getMinutes();

    const renderInfoContent = () => {
        if (!activeInfoPanel) return null;
        switch (activeInfoPanel) {
            case 'location': return (
                <div>
                    {loading.location && <div className="animate-pulse h-10 bg-slate-700/50 rounded w-3/4 mx-auto"></div>}
                    {errors.location && <p className="text-red-400">{errors.location}</p>}
                    {location && <><p className="text-2xl font-semibold text-white">{location.city}</p><p className="text-gray-400">{location.country}</p></>}
                </div>
            );
            case 'weather': return (
                <div>
                    {loading.weather && <div className="animate-pulse h-20 bg-slate-700/50 rounded w-1/2 mx-auto"></div>}
                    {errors.weather && <p className="text-red-400">{errors.weather}</p>}
                    {weather && <><p className="text-3xl font-bold">{weather.temperatureCelsius}°C</p><p className="text-cyan-200 capitalize">{weather.condition}</p><div className="text-sm text-gray-400 mt-2"><p>{t('humidity')}: {weather.humidityPercent}%</p><p>{t('wind')}: {weather.windSpeedKmh} km/h</p></div></>}
                </div>
            );
            case 'events': return (
                 <div>
                    {loading.events && <div className="animate-pulse space-y-3"><div className="h-10 bg-slate-700/50 rounded"></div><div className="h-10 bg-slate-700/50 rounded"></div></div>}
                    {errors.events && <p className="text-red-400">{errors.events}</p>}
                    <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">{events?.map(event => (<li key={event.name}><p className="font-bold text-white">{event.name} <span className="font-normal text-gray-400 text-sm">({event.date})</span></p><p className="text-sm text-gray-300">{event.description}</p></li>))}</ul>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 z-40">
            <div className="max-w-3xl mx-auto p-3 bg-slate-900/60 backdrop-blur-md border border-cyan-400/20 rounded-xl text-white transition-all duration-300 ease-in-out">
                {/* Time Controls */}
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="text-cyan-300 hover:text-white transition-colors" title={isPlaying ? t('pause') : t('play')}>
                        {isPlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
                    </button>
                    <button onClick={() => setSimTime(new Date())} className="text-cyan-300 hover:text-white transition-colors" title={t('now')}>
                        <NowIcon className="w-8 h-8"/>
                    </button>
                    <div className="flex-grow text-center">
                        <p className="font-mono text-lg">{simTime.toLocaleDateString(lang, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="font-mono text-2xl font-bold">{simTime.toLocaleTimeString(lang, {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</p>
                    </div>
                    <input type="range" min="0" max="1439" value={timeValue} onChange={handleTimeChange} className="w-1/2 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb"/>
                </div>

                {/* Info Buttons */}
                <div className="flex items-center justify-center gap-4 mt-3 border-t border-cyan-400/20 pt-3">
                     <button onClick={() => setActiveInfoPanel(p => p === 'location' ? null : 'location')} title={t('locationPanelTitle')} className={`flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-md border rounded-full text-white hover:bg-cyan-900/70 transition-all duration-300 ${activeInfoPanel === 'location' ? 'border-cyan-400 ring-2 ring-cyan-400' : 'border-cyan-400/20'}`}>
                        <LocationIcon className="w-5 h-5" /> <span className="hidden sm:inline">{t('locationPanelTitle')}</span>
                    </button>
                    <button onClick={() => setActiveInfoPanel(p => p === 'weather' ? null : 'weather')} title={t('weatherPanelTitle')} className={`flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-md border rounded-full text-white hover:bg-cyan-900/70 transition-all duration-300 ${activeInfoPanel === 'weather' ? 'border-cyan-400 ring-2 ring-cyan-400' : 'border-cyan-400/20'}`}>
                        <WeatherIcon className="w-5 h-5" /> <span className="hidden sm:inline">{t('weatherPanelTitle')}</span>
                    </button>
                    <button onClick={() => setActiveInfoPanel(p => p === 'events' ? null : 'events')} title={t('eventsPanelTitle')} className={`flex items-center gap-2 px-4 py-2 bg-slate-900/50 backdrop-blur-md border rounded-full text-white hover:bg-cyan-900/70 transition-all duration-300 ${activeInfoPanel === 'events' ? 'border-cyan-400 ring-2 ring-cyan-400' : 'border-cyan-400/20'}`}>
                        <CalendarIcon className="w-5 h-5" /> <span className="hidden sm:inline">{t('eventsPanelTitle')}</span>
                    </button>
                </div>

                {/* Info Content Panel */}
                <div className={`transition-[max-height,padding] duration-500 ease-in-out overflow-hidden text-center ${activeInfoPanel ? 'max-h-64 pt-4 mt-3 border-t border-cyan-400/20' : 'max-h-0'}`}>
                    {renderInfoContent()}
                </div>
            </div>
            <style>{`.range-thumb::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; background: #22d3ee; cursor: pointer; border-radius: 50%; }`}</style>
        </div>
    );
};

const CelestialInfoModal: React.FC<{
    bodyId: string | null; details: CelestialBodyDetails | null; image: string | null; isOpen: boolean; onClose: () => void;
    isLoading: { details: boolean; image: boolean }; error: string | null; lang: Language;
}> = ({ bodyId, details, image, isOpen, onClose, isLoading, error, lang }) => {
    if (!isOpen) return null;
    const t = (key: keyof typeof translations.ui) => translations.ui[key][lang];
    
    const allBodies = [...CELESTIAL_BODIES, ...BRIGHTEST_STARS];
    const bodyData = allBodies.find(b => b.id === bodyId);
    let bodyName = bodyId || '';
    if (bodyData) {
       if ('nameKey' in bodyData) {
           bodyName = translations.celestialBodyNames[bodyData.nameKey as keyof typeof translations.celestialBodyNames][lang];
       } else if ('name' in bodyData) {
           bodyName = bodyData.name;
       }
    }
    
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900/80 border border-cyan-300/30 rounded-2xl w-full max-w-4xl max-h-[90vh] text-white shadow-2xl shadow-cyan-500/10 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"><CloseIcon className="w-6 h-6" /></button>
                     <div className="flex flex-col md:flex-row gap-6">
                        <div className="md:w-1/3 flex-shrink-0">
                           {(isLoading.image || isLoading.details) ? (
                                <div className="w-full aspect-square bg-slate-700 rounded-lg animate-pulse"></div>
                           ) : image ? (
                                <img src={image} alt={details?.name || bodyName} className="w-full aspect-square object-cover rounded-lg shadow-lg shadow-cyan-500/20" />
                           ) : (
                                <div className="w-full aspect-square bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">{/* Image not available */}</div>
                           )}
                        </div>
                        <div className="md:w-2/3">
                            {(isLoading.details || !details) && (<div>
                                <h2 className="text-3xl font-bold text-cyan-300 mb-4">{bodyName || t('loading')}</h2>
                                <div className="animate-pulse space-y-4"><div className="h-4 bg-slate-700 rounded w-1/4"></div><div className="h-24 bg-slate-700 rounded"></div><div className="h-6 bg-slate-700 rounded w-1/3 mt-6"></div><div className="h-16 bg-slate-700 rounded"></div></div>
                            </div>)}
                            {error && <p className="text-red-400">{error}</p>}
                            {details && (<div className="overflow-y-auto max-h-[calc(90vh-4rem)] pr-2">
                                <h2 className="text-3xl font-bold text-cyan-300 mb-2">{details.name}</h2>
                                <p className="text-cyan-100/70 italic mb-4">{details.type}</p>
                                <p className="text-gray-300 leading-relaxed">{details.description}</p>
                                <h3 className="text-xl font-semibold text-cyan-300 mt-6 mb-3">{t('characteristics')}</h3>
                                <ul className="space-y-2">{details.characteristics.map((char, i) => (<li key={i} className="flex justify-between border-b border-white/10 py-1"><span className="font-medium text-gray-400">{char.label}</span><span className="text-gray-200">{char.value}</span></li>))}</ul>
                                <h3 className="text-xl font-semibold text-cyan-300 mt-6 mb-3">{t('funFacts')}</h3>
                                <ul className="list-disc list-inside space-y-2 text-gray-300">{details.funFacts.map((fact, i) => <li key={i}>{fact}</li>)}</ul>
                            </div>)}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@keyframes fade-in-scale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } .animate-fade-in-scale { animation: fade-in-scale 0.3s ease-out forwards; }`}</style>
        </div>
    );
};

const InitialView: React.FC<{ onLocationSet: (coords: Coordinates) => void, lang: Language, setLang: (lang: Language) => void }> = ({ onLocationSet, lang, setLang }) => {
    const t = (key: keyof typeof translations.ui) => translations.ui[key][lang];

    const handleGeolocation = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => onLocationSet({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
            (error) => { console.error("Geolocation error:", error); alert("Could not get location. Please allow location access."); }
        );
    };

    // FIX: Correctly handle form submission with type-safe access to form fields.
    // The previous implementation `e.currentTarget.latitude` was not type-safe.
    // This is updated to use `FormData` and a specific `React.FormEvent<HTMLFormElement>` type.
    const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const lat = parseFloat(formData.get('latitude') as string);
        const lon = parseFloat(formData.get('longitude') as string);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            onLocationSet({ latitude: lat, longitude: lon });
        } else {
            alert("Invalid coordinates. Please enter valid latitude (-90 to 90) and longitude (-180 to 180).");
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 bg-gradient-to-b from-black via-indigo-900 to-black">
            <LanguageSelector lang={lang} setLang={setLang} className="absolute top-4 right-4 z-50"/>
            <div className="text-center z-10 max-w-lg w-full">
                <h1 className="text-4xl md:text-5xl font-bold text-cyan-300 mb-4">{t('title')}</h1>
                <p className="text-lg text-gray-300 mb-8">{lang === 'fr' ? 'Une simulation de planétarium interactive dans votre navigateur. Partagez votre géolocalisation pour commencer.' : 'An interactive planetarium simulation in your browser. Share your geolocation to begin.'}</p>
                <button onClick={handleGeolocation} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">{t('findLocation')}</button>
                <div className="my-8 text-gray-400">{t('manualEntry')}</div>
                <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row items-stretch justify-center gap-2 max-w-md mx-auto">
                    <input type="number" step="any" name="latitude" placeholder={t('latitude')} required min="-90" max="90" className="bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 flex-1" aria-label={t('latitude')} />
                    <input type="number" step="any" name="longitude" placeholder={t('longitude')} required min="-180" max="180" className="bg-slate-800/50 border border-white/20 rounded-lg px-4 py-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 flex-1" aria-label={t('longitude')} />
                    <button type="submit" className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">{t('submit')}</button>
                </form>
            </div>
        </div>
    );
};

const Compass: React.FC<{
    screenSize: { width: number; height: number };
    rotation: number;
    lang: Language;
}> = ({ screenSize, rotation, lang }) => {
    if (!screenSize.width) return null;
    const t = (key: 'north' | 'east' | 'south' | 'west') => translations.ui[key][lang];

    const cardinalPoints = [
        { label: t('north'), azimuth: 0 },
        { label: t('east'), azimuth: 90 },
        { label: t('south'), azimuth: 180 },
        { label: t('west'), azimuth: 270 },
    ];
    
    return (
        <>
            {cardinalPoints.map(point => {
                const { x, y } = projectToScreen(point.azimuth, 2, screenSize, rotation);
                return (
                    <div key={point.label} className="absolute text-cyan-300/70 font-bold text-xl select-none pointer-events-none"
                         style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}>
                        {point.label}
                    </div>
                );
            })}
        </>
    );
};


const ObservatoryView: React.FC<any> = ({ lang, coordinates, simTime, isPlaying, skyRotation, setSkyRotation, screenSize, objectPositions, handleBodyClick, location, weather, events, loading, errors, setSimTime, setIsPlaying }) => {
    const skyViewRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const lastMouseXRef = useRef(0);
    const sunPosition = objectPositions['sun'];
    const skyColor = useMemo(() => sunPosition ? getSkyColor(sunPosition.altitude) : 'bg-black', [sunPosition]);
    
    // --- Interaction Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => { isDraggingRef.current = true; lastMouseXRef.current = e.clientX; e.currentTarget.classList.add('cursor-grabbing'); };
    const handleMouseMove = (e: React.MouseEvent) => { if (!isDraggingRef.current) return; const dx = e.clientX - lastMouseXRef.current; setSkyRotation((prev: number) => (prev + dx * 0.4 + 360) % 360); lastMouseXRef.current = e.clientX; };
    const handleMouseUpOrLeave = (e: React.MouseEvent) => { isDraggingRef.current = false; e.currentTarget.classList.remove('cursor-grabbing');};
    const handleTouchStart = (e: React.TouchEvent) => { isDraggingRef.current = true; lastMouseXRef.current = e.touches[0].clientX; };
    const handleTouchMove = (e: React.TouchEvent) => { if (!isDraggingRef.current) return; const dx = e.touches[0].clientX - lastMouseXRef.current; setSkyRotation((prev: number) => (prev + dx * 0.4 + 360) % 360); lastMouseXRef.current = e.touches[0].clientX; };
    const handleTouchEnd = () => { isDraggingRef.current = false; };

    return (
        <div className={`w-full h-full overflow-hidden transition-colors duration-1000 ${skyColor} relative`}>
            <div ref={skyViewRef} className="absolute inset-0 cursor-grab" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {/* Stars */}
                {STARS.map(star => {
                    const pos = objectPositions[star.id];
                    if (!pos || !pos.visible) return null;
                    const brightness = Math.max(0.2, 1 - star.magnitude / 5);
                    return <div key={star.id} className="absolute rounded-full bg-white/80 pointer-events-none" style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${brightness * 2}px`, height: `${brightness * 2}px`, opacity: sunPosition?.altitude < -5 ? brightness : 0, transition: 'opacity 0.5s' }}/>
                })}
                 {/* Constellations */}
                 {sunPosition?.altitude < -10 && CONSTELLATIONS.map((constellation, i) => constellation.lines.map((line, j) => {
                    const star1Pos = objectPositions[line.stars[0]];
                    const star2Pos = objectPositions[line.stars[1]];
                    if (!star1Pos || !star2Pos || !star1Pos.visible || !star2Pos.visible) return null;
                    return <svg key={`${i}-${j}`} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{opacity: 0.3}}><line x1={star1Pos.x} y1={star1Pos.y} x2={star2Pos.x} y2={star2Pos.y} stroke="rgba(0, 255, 255, 0.4)" strokeWidth="1" /></svg>
                }))}
                {/* Celestial Bodies */}
                {CELESTIAL_BODIES.map(body => {
                    const pos = objectPositions[body.id];
                    if (!pos || !pos.visible) return null;
                    return (
                        <div key={body.id} className="absolute group cursor-pointer" style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)' }} onClick={() => handleBodyClick(body.id)}>
                            <div className={`w-${body.size} h-${body.size} ${body.color} rounded-full transition-all duration-300 ease-in-out group-hover:scale-125 shadow-[0_0_15px_2px_rgba(255,255,255,0.4)]`}></div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-black/50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                                {translations.celestialBodyNames[body.nameKey][lang]}
                            </div>
                        </div>
                    );
                })}
                 {/* Brightest Stars with click handlers */}
                {BRIGHTEST_STARS.map(star => {
                    const pos = objectPositions[star.id];
                    if (!pos || !pos.visible) return null;
                     const brightness = Math.max(0.4, 1 - star.magnitude / 4);
                    return (
                        <div key={star.id} className="absolute group cursor-pointer" style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)' }} onClick={() => handleBodyClick(star.id)}>
                             <div className="absolute rounded-full bg-white transition-all duration-300 ease-in-out group-hover:scale-150" style={{width: `${brightness * 3}px`, height: `${brightness * 3}px`, opacity: sunPosition?.altitude < -5 ? brightness : 0, boxShadow: `0 0 ${brightness*8}px rgba(255, 255, 255, 0.7)`}}/>
                             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[150%] bg-black/50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
                                {star.name}
                            </div>
                        </div>
                    )
                })}
                <Compass screenSize={screenSize} rotation={skyRotation} lang={lang} />
            </div>
            <TimeController 
                simTime={simTime} setSimTime={setSimTime} 
                isPlaying={isPlaying} setIsPlaying={setIsPlaying} 
                lang={lang}
                location={location} weather={weather} events={events}
                loading={loading} errors={errors}
            />
        </div>
    )
}

// --- EDUCATION PAGE ---
const EducationPage: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = (key: keyof typeof translations.ui) => translations.ui[key][lang];
    const [selectedTopic, setSelectedTopic] = useState<EducationTopic | null>(null);
    const [content, setContent] = useState<EducationContent | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);

    const handleTopicSelect = useCallback((topic: EducationTopic) => {
        setSelectedTopic(topic);
        setContent(null);
        setIsLoading(true);
        setError(null);
        const topicTitle = translations.educationTopics[topic.titleKey][lang];
        fetchEducationContent(topicTitle, lang)
            .then(data => {
                if (data) setContent(data);
                else setError(t('error'));
            })
            .catch(() => setError(t('error')))
            .finally(() => setIsLoading(false));
    }, [lang, t]);

    if (selectedTopic && (content || isLoading || error)) {
        return (
            <PageContainer title={isLoading ? t('loading') : content?.title || t('error')}>
                 <button onClick={() => setSelectedTopic(null)} className="mb-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">&larr; {t('backToTopics')}</button>
                {isLoading && <div className="animate-pulse space-y-4"><div className="h-6 bg-slate-700 rounded w-3/4"></div><div className="h-24 bg-slate-700 rounded"></div><div className="h-6 bg-slate-700 rounded w-1/2 mt-6"></div><div className="h-16 bg-slate-700 rounded"></div></div>}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {content && (
                    <div className="bg-slate-900/50 p-6 rounded-lg border border-cyan-400/20">
                        {content.paragraphs.map((p, i) => <p key={i} className="mb-4 leading-relaxed text-lg text-gray-300">{p}</p>)}
                        <h3 className="text-2xl font-semibold text-cyan-300 mt-8 mb-4">{t('keyConcepts')}</h3>
                        <div className="space-y-4">
                            {content.keyConcepts.map((kc, i) => (
                                <div key={i} className="p-4 bg-slate-800/60 rounded-lg border-l-4 border-cyan-400">
                                    <h4 className="font-bold text-white text-xl">{kc.concept}</h4>
                                    <p className="text-gray-400">{kc.explanation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </PageContainer>
        )
    }

    return (
        <PageContainer title={t('education')}>
            <p className="text-center text-lg text-gray-400 mb-10">{t('selectTopic')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {EDUCATION_TOPICS.map(topic => (
                    <button key={topic.id} onClick={() => handleTopicSelect(topic)} className="bg-slate-800/50 p-8 rounded-xl border border-cyan-400/20 text-center hover:bg-cyan-900/50 hover:border-cyan-400 transition-all duration-300 transform hover:-translate-y-2 group">
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{topic.icon}</div>
                        <h2 className="text-2xl font-bold text-white mb-2">{translations.educationTopics[topic.titleKey][lang]}</h2>
                        <p className="text-gray-400">{translations.educationSummaries[topic.summaryKey][lang]}</p>
                    </button>
                ))}
            </div>
        </PageContainer>
    );
};


// --- QUIZ PAGE ---
const QuizPage: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = (key: keyof typeof translations.ui) => translations.ui[key][lang];
    const [selectedTopic, setSelectedTopic] = useState<EducationTopic | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);

    const handleStartQuiz = (topic: EducationTopic) => {
        setSelectedTopic(topic);
        setIsLoading(true);
        setError(null);
        setQuestions(null);
        const topicTitle = translations.educationTopics[topic.titleKey][lang];
        fetchQuizQuestions(topicTitle, lang)
            .then(data => {
                if (data) {
                    setQuestions(data);
                    setCurrentQuestionIndex(0);
                    setScore(0);
                    setSelectedAnswer(null);
                    setIsAnswered(false);
                } else {
                    setError(t('error'));
                }
            })
            .catch(() => setError(t('error')))
            .finally(() => setIsLoading(false));
    };

    const handleSubmitAnswer = () => {
        if (!selectedAnswer || !questions) return;
        setIsAnswered(true);
        if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
            setScore(prev => prev + 1);
        }
    };

    const handleNextQuestion = () => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex(prev => prev + 1);
    };

    const resetQuiz = () => {
        setSelectedTopic(null);
        setQuestions(null);
    }
    
    if (isLoading) {
        return <PageContainer title={t('loading')}><div className="text-center text-2xl text-cyan-300">{t('loading')}</div></PageContainer>
    }
    if (error) {
         return <PageContainer title={t('error')}><p className="text-red-400 text-center">{error}</p></PageContainer>
    }

    if (selectedTopic && questions) {
        const isFinished = currentQuestionIndex >= questions.length;
        if (isFinished) {
            return (
                 <PageContainer title={t('yourScore')}>
                    <div className="bg-slate-800/50 p-8 rounded-xl border border-cyan-400/20 text-center">
                        <p className="text-2xl text-gray-300 mb-4">{t('yourScore')}:</p>
                        <p className="text-6xl font-bold text-cyan-300 mb-8">{score} / {questions.length}</p>
                        <button onClick={resetQuiz} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105">{t('playAgain')}</button>
                    </div>
                 </PageContainer>
            )
        }

        const currentQuestion = questions[currentQuestionIndex];
        return (
            <PageContainer title={translations.educationTopics[selectedTopic.titleKey][lang]}>
                <div className="bg-slate-800/50 p-8 rounded-xl border border-cyan-400/20">
                    <p className="text-gray-400 mb-2">{`Question ${currentQuestionIndex + 1} / ${questions.length}`}</p>
                    <h2 className="text-2xl font-semibold text-white mb-6">{currentQuestion.question}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {currentQuestion.options.map(option => {
                            const isCorrect = option === currentQuestion.correctAnswer;
                            const isSelected = option === selectedAnswer;
                            let buttonClass = 'bg-slate-700 hover:bg-slate-600';
                            if (isAnswered) {
                                if (isCorrect) buttonClass = 'bg-green-500/80';
                                else if (isSelected) buttonClass = 'bg-red-500/80';
                                else buttonClass = 'bg-slate-700/50 opacity-50';
                            }
                            return <button key={option} onClick={() => !isAnswered && setSelectedAnswer(option)} disabled={isAnswered} className={`p-4 rounded-lg text-left transition-all text-white ${buttonClass} ${isSelected && !isAnswered ? 'ring-2 ring-cyan-400' : ''}`}>{option}</button>
                        })}
                    </div>
                     {isAnswered && (
                        <div className="p-4 bg-slate-900/50 rounded-lg mb-6 border-l-4 border-cyan-400">
                           <p className={`font-bold text-xl mb-2 ${selectedAnswer === currentQuestion.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>
                               {selectedAnswer === currentQuestion.correctAnswer ? t('correct') : t('incorrect')}
                           </p>
                           <p className="text-gray-300">{currentQuestion.explanation}</p>
                        </div>
                     )}
                    <div className="text-right">
                        {isAnswered ? (
                             <button onClick={handleNextQuestion} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-full">{t('nextQuestion')}</button>
                        ) : (
                             <button onClick={handleSubmitAnswer} disabled={!selectedAnswer} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed">{t('submitAnswer')}</button>
                        )}
                    </div>
                </div>
            </PageContainer>
        )
    }

    // Topic selection view
    return (
        <PageContainer title={t('quiz')}>
            <p className="text-center text-lg text-gray-400 mb-10">{t('selectTopic')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {EDUCATION_TOPICS.map(topic => (
                    <div key={topic.id} className="bg-slate-800/50 p-8 rounded-xl border border-cyan-400/20 text-center flex flex-col justify-between">
                        <div>
                          <div className="text-6xl mb-4">{topic.icon}</div>
                          <h2 className="text-2xl font-bold text-white mb-2">{translations.educationTopics[topic.titleKey][lang]}</h2>
                          <p className="text-gray-400 mb-6">{translations.educationSummaries[topic.summaryKey][lang]}</p>
                        </div>
                        <button onClick={() => handleStartQuiz(topic)} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-full self-center mt-4">{t('startQuiz')}</button>
                    </div>
                ))}
            </div>
        </PageContainer>
    );
};

// --- NAVIGATION ---
const Navigation: React.FC<{ currentPage: Page, setCurrentPage: (page: Page) => void, lang: Language, setLang: (lang: Language) => void }> = ({ currentPage, setCurrentPage, lang, setLang }) => {
    const t = (key: keyof typeof translations.ui) => translations.ui[key][lang];
    const navItems: { page: Page, label: string }[] = [
        { page: 'observatory', label: t('observatory') },
        { page: 'education', label: t('education') },
        { page: 'quiz', label: t('quiz') },
    ];
    return (
        <header className="absolute top-0 left-0 right-0 z-50 p-4 bg-black/30 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                 <h1 className="text-xl font-bold text-cyan-300 hidden sm:block">{t('title')}</h1>
                 <nav className="flex items-center justify-center gap-2 sm:gap-4 p-1 bg-slate-900/50 border border-cyan-400/20 rounded-full">
                     {navItems.map(item => (
                        <button key={item.page} onClick={() => setCurrentPage(item.page)} className={`px-4 sm:px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-colors ${currentPage === item.page ? 'bg-cyan-400 text-black' : 'text-white hover:bg-slate-700'}`}>
                            {item.label}
                        </button>
                     ))}
                 </nav>
                 <LanguageSelector lang={lang} setLang={setLang} />
            </div>
        </header>
    );
}


// --- MAIN APP COMPONENT ---

export default function App() {
    const [lang, setLang] = useState<Language>('fr');
    const [currentPage, setCurrentPage] = useState<Page>('observatory');
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [location, setLocation] = useState<LocationInfo | null>(null);
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [events, setEvents] = useState<AstroEvent[] | null>(null);
    const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
    const [modalDetails, setModalDetails] = useState<CelestialBodyDetails | null>(null);
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [simTime, setSimTime] = useState(new Date());
    const [isPlaying, setIsPlaying] = useState(true);
    const [skyRotation, setSkyRotation] = useState(0);
    const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
    
    const [loading, setLoading] = useState<LoadingState>({ location: false, weather: false, events: false, modal: false, modalImage: false });
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({ location: null, weather: null, events: null, modal: null });

    const mainViewRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number | null>(null);

    // Register Service Worker for PWA capabilities
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
            });
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);

    useEffect(() => {
        const mainView = mainViewRef.current;
        if (!mainView) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setScreenSize({ width, height });
            }
        });
        resizeObserver.observe(mainView);
        return () => resizeObserver.disconnect();
    }, [coordinates]);

    const fetchData = useCallback(async (coords: Coordinates, currentLang: Language) => {
        setLoading(p => ({ ...p, location: true, weather: true, events: true }));
        setErrors(p => ({ ...p, location: null, weather: null, events: null }));
        
        const currentDate = new Date();
        const initialData = await fetchInitialData(coords, currentLang, currentDate);
        
        if (initialData) {
            setLocation(initialData.location);
            setWeather(initialData.weather);
            setEvents(initialData.events);
        } else {
            const errorMsg = translations.ui.error[currentLang];
            setLocation(null);
            setWeather(null);
            setEvents(null);
            setErrors(p => ({ ...p, location: errorMsg, weather: errorMsg, events: errorMsg }));
        }
        setLoading(p => ({ ...p, location: false, weather: false, events: false }));
    }, []);

    useEffect(() => {
        if (coordinates) fetchData(coordinates, lang);
    }, [coordinates, lang, fetchData]);
    
    useEffect(() => {
        const animate = () => {
            if (isPlaying && currentPage === 'observatory') {
                setSimTime(prevTime => new Date(prevTime.getTime() + 50000 * 0.05));
            }
            animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isPlaying, currentPage]);
    
    const handleBodyClick = useCallback((bodyId: string) => {
        setSelectedBodyId(bodyId);
        setModalDetails(null);
        setModalImage(null);
        setLoading(prev => ({ ...prev, modal: true, modalImage: true }));
        setErrors(prev => ({...prev, modal: null}));

        const allBodies = [...CELESTIAL_BODIES, ...BRIGHTEST_STARS];
        const bodyData = allBodies.find(b => b.id === bodyId);
        let bodyNameToFetch = bodyId;
        if (bodyData) {
           if ('nameKey' in bodyData) {
               bodyNameToFetch = translations.celestialBodyNames[bodyData.nameKey as keyof typeof translations.celestialBodyNames][lang];
           } else if ('name' in bodyData) {
               bodyNameToFetch = bodyData.name;
           }
        }

        fetchCelestialBodyInfo(bodyNameToFetch, lang)
            .then(data => { setModalDetails(data); if(!data) setErrors(prev => ({...prev, modal: translations.ui.error[lang]})); })
            .catch(() => setErrors(prev => ({...prev, modal: translations.ui.error[lang]})))
            .finally(() => setLoading(prev => ({ ...prev, modal: false })));

        generateCelestialBodyImage(bodyNameToFetch)
            .then(imageData => { if(imageData) setModalImage(`data:image/jpeg;base64,${imageData}`); })
            .catch(() => { /* Silent fail for image */ })
            .finally(() => setLoading(prev => ({ ...prev, modalImage: false })));

    }, [lang]);

    const objectPositions = useMemo(() => {
        if (!coordinates || !screenSize.width) return {};
        const positions: Record<string, ScreenPosition> = {};
        [...CELESTIAL_BODIES, ...BRIGHTEST_STARS, ...STARS].forEach(obj => {
            positions[obj.id] = calculateObjectPosition(obj, simTime, coordinates, screenSize, skyRotation);
        });
        return positions;
    }, [coordinates, simTime, screenSize, skyRotation]);
    
    if (!coordinates) {
        return <InitialView onLocationSet={setCoordinates} lang={lang} setLang={setLang} />;
    }
    
    const observatoryViewProps = { lang, coordinates, simTime, isPlaying, skyRotation, setSkyRotation, screenSize, objectPositions, handleBodyClick, location, weather, events, loading, errors, setSimTime, setIsPlaying };

    const renderPage = () => {
        switch (currentPage) {
            case 'observatory': return <ObservatoryView {...observatoryViewProps} />;
            case 'education': return <EducationPage lang={lang} />;
            case 'quiz': return <QuizPage lang={lang} />;
            default: return <ObservatoryView {...observatoryViewProps} />;
        }
    }
    
    return (
        <main ref={mainViewRef} className="w-screen h-screen overflow-hidden bg-black">
            <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} lang={lang} setLang={setLang}/>
            {renderPage()}
            <CelestialInfoModal 
                bodyId={selectedBodyId} 
                details={modalDetails}
                image={modalImage}
                isOpen={!!selectedBodyId} 
                onClose={() => setSelectedBodyId(null)} 
                isLoading={{ details: loading.modal, image: loading.modalImage }}
                error={errors.modal} 
                lang={lang} 
            />
        </main>
    );
}