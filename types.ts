export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  city: string;
  country: string;
}

export interface WeatherInfo {
  temperatureCelsius: number;
  condition: string;
  humidityPercent: number;
  windSpeedKmh: number;
}

export interface AstroEvent {
  name: string;
  date: string;
  description: string;
}

// Combined type for initial data fetch
export interface InitialData {
  location: LocationInfo;
  weather: WeatherInfo;
  events: AstroEvent[];
}

// Astronomical object definition
export interface AstroObject {
  id: string;
  nameKey: keyof typeof import('./i18n/translations').translations.celestialBodyNames;
  size: number; // visual size
  color: string; // tailwind color
  // We will calculate position dynamically, so no fixed angle/distance
}

// Specific type for planets which have more complex data for position calculation
export interface Planet extends AstroObject {
  type: 'planet';
  // J2000.0 epoch elements: [value, value_per_day_change]
  semimajorAxis: [number, number]; // a (AU)
  eccentricity: [number, number]; // e
  inclination: [number, number]; // i (degrees)
  meanLongitude: [number, number]; // L (degrees)
  longitudeOfPerihelion: [number, number]; // w (degrees)
  longitudeOfAscendingNode: [number, number]; // o (degrees)
}

export interface Star {
    id: string;
    name: string;
    ra: number; // Right Ascension in hours
    dec: number; // Declination in degrees
    magnitude: number; // Visual magnitude (smaller is brighter)
}

export interface ConstellationLine {
    stars: [string, string]; // IDs of two stars to connect
}

// Represents the calculated position on the screen
export interface ScreenPosition {
  x: number;
  y: number;
  altitude: number;
  azimuth: number;
  visible: boolean;
}

export interface CelestialBodyDetails {
  name: string;
  type: string;
  description: string;
  characteristics: { label: string; value: string }[];
  funFacts: string[];
}

export type Language = 'fr' | 'en' | 'es' | 'de' | 'ar' | 'zh';

export type LoadingState = {
  location: boolean;
  weather: boolean;
  events: boolean;
  modal: boolean;
  modalImage: boolean;
};

export type Page = 'observatory' | 'education' | 'quiz';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface EducationTopic {
  id: string;
  titleKey: keyof typeof import('./i18n/translations').translations.educationTopics;
  summaryKey: keyof typeof import('./i18n/translations').translations.educationSummaries;
  icon: string; // emoji
}

export interface EducationContent {
  title: string;
  paragraphs: string[];
  keyConcepts: {
    concept: string;
    explanation: string;
  }[];
}