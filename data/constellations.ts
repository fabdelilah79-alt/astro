import type { ConstellationLine } from '../types';

interface Constellation {
    name: string;
    lines: ConstellationLine[];
}

// Using star IDs from data/stars.ts
export const CONSTELLATIONS: Constellation[] = [
    {
        name: 'Orion',
        lines: [
            { stars: ['rigel', 'betelgeuse'] },
        ]
    },
    {
        name: 'Ursa Major (Big Dipper part)',
        lines: [] // Would need more stars defined
    },
    {
        name: 'Cygnus (Northern Cross)',
        lines: [
            { stars: ['deneb', 'altair'] }, // Summer Triangle approximation
        ]
    },
    {
        name: 'Crux (Southern Cross)',
        lines: [
             { stars: ['acrux', 'mimosa'] },
        ]
    }
];
