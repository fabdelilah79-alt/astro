import type { Coordinates, AstroObject, Star, ScreenPosition, Planet } from '../types';

// --- UTILITY FUNCTIONS ---
const toRad = (deg: number): number => deg * Math.PI / 180;
const toDeg = (rad: number): number => rad * 180 / Math.PI;

// --- CORE ASTRONOMICAL CALCULATIONS ---

/**
 * Calculates the Julian Day number from a JavaScript Date object.
 */
function getJulianDay(date: Date): number {
    return (date.getTime() / 86400000) - (date.getTimezoneOffset() / 1440) + 2440587.5;
}

/**
 * Calculates the Local Sidereal Time (LST) for a given location and time.
 * @returns LST in hours.
 */
function getLocalSiderealTime(date: Date, coords: Coordinates): number {
    const jd = getJulianDay(date);
    const d = jd - 2451545.0;
    const GMST = 18.697374558 + 24.06570982441908 * d;
    const LST_rad = toRad(GMST * 15 + coords.longitude);
    return toDeg(LST_rad) / 15;
}

/**
 * Converts celestial coordinates (Right Ascension, Declination) to horizontal coordinates (Azimuth, Altitude).
 */
function raDecToAzAlt(ra: number, dec: number, lst: number, lat: number): { azimuth: number, altitude: number } {
    const latRad = toRad(lat);
    const decRad = toRad(dec);
    const ha = toRad((lst - ra) * 15);

    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha);
    const altitude = toDeg(Math.asin(sinAlt));

    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(toRad(altitude))); // use altitude in rad
    let azimuth = toDeg(Math.acos(cosAz));

    if (Math.sin(ha) > 0) {
        azimuth = 360 - azimuth;
    }

    return { azimuth, altitude };
}

/**
 * Calculates the approximate RA/Dec for the Sun.
 * Simplified model.
 */
function getSunPosition(date: Date): { ra: number, dec: number } {
    const jd = getJulianDay(date);
    const n = jd - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360;
    const g = toRad((357.528 + 0.9856003 * n) % 360);
    const lambda = toRad(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
    const epsilon = toRad(23.439 - 0.0000004 * n);
    
    const raRad = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
    let ra = toDeg(raRad) / 15;
    if (ra < 0) ra += 24;

    const decRad = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
    const dec = toDeg(decRad);
    
    return { ra, dec };
}

/**
 * Calculates the approximate RA/Dec for the Moon.
 * Highly simplified model.
 */
function getMoonPosition(date: Date): { ra: number, dec: number } {
    const jd = getJulianDay(date);
    const d = jd - 2451545.0;
    const l = toRad((218.316 + 13.176396 * d) % 360); // Mean longitude
    const m = toRad((134.963 + 13.064993 * d) % 360); // Mean anomaly
    const f = toRad((93.272 + 13.229350 * d) % 360); // Mean distance

    const lon = l + toRad(6.289 * Math.sin(m));
    const lat = toRad(5.128 * Math.sin(f));
    const epsilon = toRad(23.4397);
    
    let ra = toDeg(Math.atan2(Math.sin(lon) * Math.cos(epsilon) - Math.tan(lat) * Math.sin(epsilon), Math.cos(lon))) / 15;
    if (ra < 0) ra += 24;

    const dec = toDeg(Math.asin(Math.sin(lat) * Math.cos(epsilon) + Math.cos(lat) * Math.sin(epsilon) * Math.sin(lon)));
    
    return { ra, dec };
}

/**
 * Calculates planetary positions using simplified orbital mechanics.
 */
function getPlanetPosition(planet: Planet, date: Date): { ra: number, dec: number } {
    const jd = getJulianDay(date);
    const d = jd - 2451545.0; // days since J2000

    // Orbital elements corrected for time `d`
    const a = planet.semimajorAxis[0] + planet.semimajorAxis[1] * d;
    const e = planet.eccentricity[0] + planet.eccentricity[1] * d;
    const i = toRad(planet.inclination[0] + planet.inclination[1] * d);
    const L = toRad((planet.meanLongitude[0] + planet.meanLongitude[1] * d) % 360);
    const w = toRad(planet.longitudeOfPerihelion[0] + planet.longitudeOfPerihelion[1] * d);
    const N = toRad(planet.longitudeOfAscendingNode[0] + planet.longitudeOfAscendingNode[1] * d);
    
    const M = (L - w + 2 * Math.PI) % (2* Math.PI);

    let E = M;
    for (let k = 0; k < 6; k++) {
         E = M + e * Math.sin(E);
    }

    const x_orb = a * (Math.cos(E) - e);
    const y_orb = a * Math.sqrt(1 - e*e) * Math.sin(E);

    const x_ecl = x_orb * (Math.cos(w) * Math.cos(N) - Math.sin(w) * Math.sin(N) * Math.cos(i)) - y_orb * (Math.sin(w) * Math.cos(N) + Math.cos(w) * Math.sin(N) * Math.cos(i));
    const y_ecl = x_orb * (Math.cos(w) * Math.sin(N) + Math.sin(w) * Math.cos(N) * Math.cos(i)) + y_orb * (Math.cos(w) * Math.cos(N) * Math.cos(i) - Math.sin(w) * Math.sin(N));
    const z_ecl = x_orb * (Math.sin(w) * Math.sin(i)) + y_orb * (Math.cos(w) * Math.sin(i));

    const M_earth = toRad((357.52911 + 0.98560028 * d) % 360);
    const e_earth = 0.016708634 - 0.000042037 * d;
    let E_earth = M_earth + e_earth * Math.sin(M_earth);
    for (let k = 0; k < 5; k++) {
        E_earth = M_earth + e_earth * Math.sin(E_earth);
    }
    
    const x_earth_helio = Math.cos(E_earth) - e_earth;
    const y_earth_helio = Math.sqrt(1-e_earth*e_earth) * Math.sin(E_earth);
    
    const x_geo_ecl = x_ecl - x_earth_helio;
    const y_geo_ecl = y_ecl - y_earth_helio;
    const z_geo_ecl = z_ecl;

    const eclipticObliquity = toRad(23.4392911);
    const x_geo_eq = x_geo_ecl;
    const y_geo_eq = y_geo_ecl * Math.cos(eclipticObliquity) - z_geo_ecl * Math.sin(eclipticObliquity);
    const z_geo_eq = y_geo_ecl * Math.sin(eclipticObliquity) + z_geo_ecl * Math.cos(eclipticObliquity);

    let ra = toDeg(Math.atan2(y_geo_eq, x_geo_eq)) / 15;
    if (ra < 0) ra += 24;
    const dec = toDeg(Math.atan2(z_geo_eq, Math.sqrt(x_geo_eq*x_geo_eq + y_geo_eq*y_geo_eq)));

    return { ra, dec };
}


// --- SCREEN PROJECTION ---

/**
 * Projects Azimuth/Altitude to screen X/Y coordinates for a circular sky map.
 */
export function projectToScreen(azimuth: number, altitude: number, size: { width: number, height: number }, rotation: number): { x: number, y: number } {
    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const radius = Math.min(centerX, centerY) * 0.95;

    const r = (1 - (altitude / 90)) * radius;
    const theta = toRad(azimuth - 90 + rotation); // Apply rotation offset

    const x = centerX + r * Math.cos(theta);
    const y = centerY + r * Math.sin(theta);

    return { x, y };
}

// --- MAIN EXPORTED FUNCTION ---

export function calculateObjectPosition(
    obj: AstroObject | Star | Planet,
    date: Date,
    coords: Coordinates,
    screenSize: { width: number, height: number },
    rotation: number
): ScreenPosition {
    let ra, dec;

    if ('ra' in obj && 'dec' in obj) {
        // It's a star
        ra = obj.ra;
        dec = obj.dec;
    } else if ('type' in obj && obj.type === 'planet') {
        ({ ra, dec } = getPlanetPosition(obj as Planet, date));
    } else {
        // It's a non-planet AstroObject (Sun, Moon)
        if (obj.id === 'sun') {
            ({ ra, dec } = getSunPosition(date));
        } else if (obj.id === 'moon') {
            ({ ra, dec } = getMoonPosition(date));
        } else {
             // Fallback for any other AstroObject
            ra = 0; dec = 0;
        }
    }
    
    const lst = getLocalSiderealTime(date, coords);
    const { azimuth, altitude } = raDecToAzAlt(ra, dec, lst, coords.latitude);
    const { x, y } = projectToScreen(azimuth, altitude, screenSize, rotation);

    return { x, y, azimuth, altitude, visible: altitude >= 0 };
}


/**
 * Determines the sky background color based on the Sun's altitude.
 */
export function getSkyColor(sunAltitude: number): string {
    if (sunAltitude > 0) { // Day
        return 'bg-gradient-to-b from-blue-400 to-sky-600';
    } else if (sunAltitude > -6) { // Civil Twilight
        return 'bg-gradient-to-b from-blue-700 to-orange-800';
    } else if (sunAltitude > -12) { // Nautical Twilight
        return 'bg-gradient-to-b from-indigo-800 to-slate-900';
    } else if (sunAltitude > -18) { // Astronomical Twilight
        return 'bg-gradient-to-b from-indigo-900 to-black';
    } else { // Night
        return 'bg-black';
    }
}