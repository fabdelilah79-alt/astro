/// <reference types="vite/client" />

// FIX: Augment the NodeJS.ProcessEnv interface to include API_KEY. This avoids
// the "Cannot redeclare block-scoped variable 'process'" error by extending
// existing type definitions instead of creating a conflicting new one. This is
// the standard way to add types for environment variables in a TypeScript
// project that may include Node.js type definitions.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
