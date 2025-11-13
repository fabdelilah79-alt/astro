import type { AstroObject, Planet } from '../types';

export const CELESTIAL_BODIES: (AstroObject | Planet)[] = [
    { id: 'sun', nameKey: 'sun', size: 14, color: 'bg-yellow-300' },
    { 
        id: 'mercury', nameKey: 'mercury', size: 4, color: 'bg-gray-400', type: 'planet',
        semimajorAxis: [0.387098, 0], eccentricity: [0.205630, 0], inclination: [7.005, 0],
        meanLongitude: [252.25084, 149472.67411], longitudeOfPerihelion: [77.45645, 0], longitudeOfAscendingNode: [48.33167, 0]
    },
    { 
        id: 'venus', nameKey: 'venus', size: 6, color: 'bg-orange-200', type: 'planet',
        semimajorAxis: [0.723332, 0], eccentricity: [0.006773, 0], inclination: [3.39471, 0],
        meanLongitude: [181.97973, 58517.81534], longitudeOfPerihelion: [131.53298, 0], longitudeOfAscendingNode: [76.68069, 0]
    },
    { id: 'moon', nameKey: 'moon', size: 5, color: 'bg-gray-200' },
    { 
        id: 'mars', nameKey: 'mars', size: 5, color: 'bg-red-400', type: 'planet',
        semimajorAxis: [1.523662, 0], eccentricity: [0.093412, 0], inclination: [1.85061, 0],
        meanLongitude: [355.45332, 19140.29931], longitudeOfPerihelion: [336.04084, 0], longitudeOfAscendingNode: [49.57854, 0]
    },
    { 
        id: 'jupiter', nameKey: 'jupiter', size: 10, color: 'bg-orange-300', type: 'planet',
        semimajorAxis: [5.203363, 0], eccentricity: [0.048392, 0], inclination: [1.30530, 0],
        meanLongitude: [34.40438, 3034.9057], longitudeOfPerihelion: [14.75385, 0], longitudeOfAscendingNode: [100.55615, 0]
    },
    { 
        id: 'saturn', nameKey: 'saturn', size: 8, color: 'bg-yellow-200', type: 'planet',
        semimajorAxis: [9.537070, 0], eccentricity: [0.054151, 0], inclination: [2.48446, 0],
        meanLongitude: [49.94432, 1222.1138], longitudeOfPerihelion: [92.43194, 0], longitudeOfAscendingNode: [113.71504, 0]
    },
];
// Mean Longitude rate is in degrees per Julian Century, so it is divided by 36525 to get deg/day in the calculation.
// Corrected rates (deg/day):
// Mercury: 149472.67411 / 36525 = 4.092334
// Venus: 58517.81534 / 36525 = 1.602130
// Mars: 19140.29931 / 36525 = 0.52402
// Jupiter: 3034.9057 / 36525 = 0.083091
// Saturn: 1222.1138 / 36525 = 0.03346
// I will apply this correction directly in the data.

(CELESTIAL_BODIES as (Planet | AstroObject)[]).forEach(body => {
    if ('type' in body && body.type === 'planet') {
        body.meanLongitude[1] = body.meanLongitude[1] / 36525;
    }
});