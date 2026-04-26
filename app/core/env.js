function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

export const OPENAI_API_KEY = firstNonEmpty(
  process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  process.env.VITE_OPENAI_API_KEY,
);

export const OPENAI_ENDPOINT = firstNonEmpty(
  process.env.EXPO_PUBLIC_OPENAI_ENDPOINT,
  process.env.VITE_OPENAI_ENDPOINT,
);

export const SHEET_CSV_URL = firstNonEmpty(
  process.env.EXPO_PUBLIC_SHEET_CSV_URL,
  process.env.VITE_SHEET_CSV_URL,
);

export const OPENAI_MODEL = firstNonEmpty(
  process.env.EXPO_PUBLIC_OPENAI_MODEL,
  process.env.VITE_OPENAI_MODEL,
  process.env.OPENAI_MODEL,
);

export const SUPABASE_URL = firstNonEmpty(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.VITE_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = firstNonEmpty(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  process.env.VITE_SUPABASE_ANON_KEY,
);
