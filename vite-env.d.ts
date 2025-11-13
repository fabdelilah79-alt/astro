/// <reference types="vite/client" />

// FIX: Define `process` to allow usage of `process.env.API_KEY` as per @google/genai
// guidelines and to resolve TypeScript errors in a client-side Vite environment.
declare var process: {
  env: {
    API_KEY: string;
  };
};
