import type { Star } from '../types';

export const BRIGHTEST_STARS: Star[] = [
    { id: 'polaris', name: 'Polaris', ra: 2.53, dec: 89.26, magnitude: 1.97 },
    { id: 'sirius', name: 'Sirius', ra: 6.75, dec: -16.7, magnitude: -1.46 },
    { id: 'canopus', name: 'Canopus', ra: 6.40, dec: -52.7, magnitude: -0.72 },
    { id: 'arcturus', name: 'Arcturus', ra: 14.26, dec: 19.2, magnitude: -0.04 },
    { id: 'alpha_centauri_a', name: 'Alpha Centauri A', ra: 14.66, dec: -60.8, magnitude: -0.01 },
    { id: 'vega', name: 'Vega', ra: 18.62, dec: 38.8, magnitude: 0.03 },
    { id: 'rigel', name: 'Rigel', ra: 5.24, dec: -8.2, magnitude: 0.12 },
    { id: 'procyon', name: 'Procyon', ra: 7.65, dec: 5.2, magnitude: 0.38 },
    { id: 'achernar', name: 'Achernar', ra: 1.63, dec: -57.2, magnitude: 0.46 },
    { id: 'betelgeuse', name: 'Betelgeuse', ra: 5.92, dec: 7.4, magnitude: 0.50 },
    { id: 'hadar', name: 'Hadar', ra: 14.06, dec: -60.4, magnitude: 0.61 },
    { id: 'altair', name: 'Altair', ra: 19.84, dec: 8.9, magnitude: 0.77 },
    { id: 'acrux', name: 'Acrux', ra: 12.44, dec: -63.1, magnitude: 0.77 },
    { id: 'capella', name: 'Capella', ra: 5.28, dec: 46.0, magnitude: 0.08 },
    { id: 'aldebaran', name: 'Aldebaran', ra: 4.60, dec: 16.5, magnitude: 0.85 },
    { id: 'spica', name: 'Spica', ra: 13.42, dec: -11.2, magnitude: 0.98 },
    { id: 'antares', name: 'Antares', ra: 16.49, dec: -26.4, magnitude: 1.09 },
    { id: 'pollux', name: 'Pollux', ra: 7.75, dec: 28.0, magnitude: 1.14 },
    { id: 'fomalhaut', name: 'Fomalhaut', ra: 22.96, dec: -29.6, magnitude: 1.16 },
    { id: 'deneb', name: 'Deneb', ra: 20.69, dec: 45.3, magnitude: 1.25 },
    { id: 'mimosa', name: 'Mimosa', ra: 12.79, dec: -59.7, magnitude: 1.25 },
];

// Combine the named bright stars with a list of generic stars for a fuller sky
const genericStars: Star[] = Array.from({ length: 80 }, (_, i) => ({
    id: `star_${i}`,
    name: `Star ${i}`,
    ra: Math.random() * 24,
    dec: Math.random() * 180 - 90,
    magnitude: 2 + Math.random() * 3,
}));

export const STARS: Star[] = [...BRIGHTEST_STARS, ...genericStars];