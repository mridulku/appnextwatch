export const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

export const PLATFORMS = [
  { id: 'netflix', name: 'Netflix', color: '#E50914', textColor: '#FFFFFF' },
  { id: 'prime', name: 'Prime Video', color: '#00A8E1', textColor: '#0E0F14' },
  { id: 'disney', name: 'Disney+', color: '#113CCF', textColor: '#FFFFFF' },
  { id: 'max', name: 'Max', color: '#3B2A5E', textColor: '#FFFFFF' },
  { id: 'hulu', name: 'Hulu', color: '#1CE783', textColor: '#0E0F14' },
  { id: 'apple', name: 'Apple TV+', color: '#FFFFFF', textColor: '#0E0F14' },
  { id: 'mubi', name: 'MUBI', color: '#141414', textColor: '#FFFFFF' },
];

export const PLATFORM_BY_ID = PLATFORMS.reduce((acc, platform) => {
  acc[platform.id] = platform;
  return acc;
}, {});

export const MOVIE_AVAILABILITY = {
  shawshank: {
    US: ['max', 'prime'],
    UK: ['netflix', 'prime'],
    CA: ['netflix'],
    IN: ['prime', 'mubi'],
    AU: ['prime'],
  },
  parasite: {
    US: ['hulu', 'max'],
    UK: ['netflix'],
    CA: ['netflix', 'prime'],
    IN: ['prime'],
    AU: ['netflix'],
  },
  'spirited-away': {
    US: ['disney'],
    UK: ['disney'],
    CA: ['disney'],
    IN: ['disney'],
    AU: ['disney'],
  },
  moonlight: {
    US: ['max', 'hulu'],
    UK: ['prime'],
    CA: ['prime'],
    IN: ['mubi'],
    AU: ['prime'],
  },
  arrival: {
    US: ['prime', 'apple'],
    UK: ['prime'],
    CA: ['prime'],
    IN: ['prime', 'apple'],
    AU: ['prime'],
  },
};
