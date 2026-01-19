function getEnv(keys, fallback = '') {
  if (typeof process !== 'undefined' && process.env) {
    for (const key of keys) {
      const val = process.env[key];
      if (val !== undefined && String(val).trim() !== '') return String(val).trim();
    }
  }
  return fallback;
}

export const OPENAI_API_KEY = getEnv([
  'EXPO_PUBLIC_OPENAI_API_KEY',
  'VITE_OPENAI_API_KEY',
]);

export const OPENAI_ENDPOINT = getEnv([
  'EXPO_PUBLIC_OPENAI_ENDPOINT',
  'VITE_OPENAI_ENDPOINT',
]);

export const SHEET_CSV_URL = getEnv([
  'EXPO_PUBLIC_SHEET_CSV_URL',
  'VITE_SHEET_CSV_URL',
]);

export const OPENAI_MODEL = getEnv([
  'EXPO_PUBLIC_OPENAI_MODEL',
  'VITE_OPENAI_MODEL',
  'OPENAI_MODEL',
]);
