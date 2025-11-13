// The reference to "vite/client" was causing a type error and has been removed.
// In accordance with the Gemini API guidelines, the application now uses process.env.API_KEY.
// This declaration provides the necessary type information for TypeScript.
declare var process: {
  env: {
    API_KEY: string;
  };
};
