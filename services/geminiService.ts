import { GoogleGenAI, Type } from "@google/genai";
import { translations } from '../i18n/translations';
import type { Coordinates, CelestialBodyDetails, Language, QuizQuestion, EducationContent, InitialData } from '../types';

// FIX: Per @google/genai guidelines, the API key must be sourced directly from process.env.API_KEY.
// The key is assumed to be available in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A simple sessionStorage wrapper to cache results from async functions.
 * This helps in reducing API calls and makes the app more resilient to rate-limiting.
 */
async function getCachedOrFetch<T>(cacheKey: string, fetchFn: () => Promise<T | null>): Promise<T | null> {
    const prefixedKey = `astro-cache-${cacheKey}`;
    try {
        const cachedItem = sessionStorage.getItem(prefixedKey);
        if (cachedItem) {
            console.log(`[Cache HIT]: ${prefixedKey}`);
            return JSON.parse(cachedItem) as T;
        }
    } catch (e) {
        console.error("Failed to read from cache, will fetch new data.", e);
        sessionStorage.removeItem(prefixedKey); // Remove corrupted item
    }

    console.log(`[Cache MISS]: ${prefixedKey}`);
    const newItem = await fetchFn();
    if (newItem) {
        try {
            sessionStorage.setItem(prefixedKey, JSON.stringify(newItem));
        } catch (e) {
            console.error("Failed to cache item. Storage may be full.", e);
        }
    }
    return newItem;
}


async function generateJson<T,>(prompt: string, schema: any, maxRetries = 3): Promise<T | null> {
  // FIX: Per @google/genai guidelines, check for process.env.API_KEY.
  if (!process.env.API_KEY) {
    console.error("Cannot call Gemini API without an API_KEY environment variable.");
    return null;
  }
  
  let attempt = 0;
  while (attempt < maxRetries) {
      try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        const text = response.text.trim();
        return JSON.parse(text) as T;
      } catch (error: any) {
        const errorMessage = (error?.message || error.toString() || '').toLowerCase();
        const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');
          
        if (isRateLimitError && attempt < maxRetries - 1) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
            console.warn(`Rate limit exceeded. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt + 1}/${maxRetries})`);
            await sleep(delay);
            attempt++;
        } else {
            console.error(`Error fetching data from Gemini (attempt ${attempt + 1}):`, error);
             if (errorMessage.includes('quota')) {
                 alert("You have exceeded the API quota. The application's features will be limited. Please try again later.");
            }
            return null; // Non-retriable error or max retries reached
        }
      }
  }
  return null;
}

export const fetchInitialData = (coords: Coordinates, lang: Language, date: Date): Promise<InitialData | null> => {
  const cacheKey = `initial-${coords.latitude.toFixed(2)}-${coords.longitude.toFixed(2)}-${lang}-${date.toISOString().split('T')[0]}`;
  
  return getCachedOrFetch(cacheKey, () => {
    const prompt = translations.prompts.initialData(coords.latitude, coords.longitude, lang, date);
    const schema = {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING },
            country: { type: Type.STRING },
          },
          required: ['city', 'country'],
        },
        weather: {
          type: Type.OBJECT,
          properties: {
            temperatureCelsius: { type: Type.NUMBER },
            condition: { type: Type.STRING },
            humidityPercent: { type: Type.NUMBER },
            windSpeedKmh: { type: Type.NUMBER },
          },
          required: ['temperatureCelsius', 'condition', 'humidityPercent', 'windSpeedKmh'],
        },
        events: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['name', 'date', 'description'],
          },
        },
      },
      required: ['location', 'weather', 'events'],
    };
    return generateJson<InitialData>(prompt, schema);
  });
};

export const fetchCelestialBodyInfo = (bodyName: string, lang: Language): Promise<CelestialBodyDetails | null> => {
  const cacheKey = `celestialInfo-${bodyName.replace(/\s+/g, '_').toLowerCase()}-${lang}`;
  
  return getCachedOrFetch(cacheKey, () => {
    const prompt = translations.prompts.celestialInfo(bodyName, lang);
    const schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: { type: Type.STRING },
        description: { type: Type.STRING },
        characteristics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
            },
            required: ['label', 'value'],
          },
        },
        funFacts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['name', 'type', 'description', 'characteristics', 'funFacts'],
    };
    return generateJson<CelestialBodyDetails>(prompt, schema);
  });
};

export const generateCelestialBodyImage = (bodyName: string, maxRetries = 3): Promise<string | null> => {
    const cacheKey = `celestialImage-${bodyName.replace(/\s+/g, '_').toLowerCase()}`;

    return getCachedOrFetch(cacheKey, async () => {
        // FIX: Per @google/genai guidelines, check for process.env.API_KEY.
        if (!process.env.API_KEY) {
            console.error("Cannot call Gemini API without an API_KEY environment variable.");
            return null;
        }
        
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: translations.prompts.celestialImage(bodyName),
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: '1:1',
                    },
                });

                if (response.generatedImages && response.generatedImages.length > 0) {
                    return response.generatedImages[0].image.imageBytes;
                }
                return null; // Success, but no image generated. Do not retry.
            } catch (error: any) {
                const errorMessage = (error?.message || error.toString() || '').toLowerCase();
                const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');
                
                if (isRateLimitError && attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                    console.warn(`Rate limit exceeded on image generation. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt + 1}/${maxRetries})`);
                    await sleep(delay);
                    attempt++;
                } else {
                    console.error(`Error generating image with Gemini (attempt ${attempt + 1}):`, error);
                    return null;
                }
            }
        }
        return null;
    });
};

export const fetchEducationContent = (topic: string, lang: Language): Promise<EducationContent | null> => {
    const cacheKey = `education-${topic.replace(/\s+/g, '_').toLowerCase()}-${lang}`;
    return getCachedOrFetch(cacheKey, () => {
        const prompt = translations.prompts.educationContent(topic, lang);
        const schema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                paragraphs: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                keyConcepts: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            concept: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                        },
                        required: ['concept', 'explanation']
                    }
                },
            },
            required: ['title', 'paragraphs', 'keyConcepts']
        };
        return generateJson<EducationContent>(prompt, schema);
    });
};

export const fetchQuizQuestions = (topic: string, lang: Language): Promise<QuizQuestion[] | null> => {
    const cacheKey = `quiz-${topic.replace(/\s+/g, '_').toLowerCase()}-${lang}`;
    return getCachedOrFetch(cacheKey, () => {
        const prompt = translations.prompts.quiz(topic, lang);
        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    correctAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctAnswer', 'explanation']
            },
        };
        return generateJson<QuizQuestion[]>(prompt, schema);
    });
};