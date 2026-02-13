# AppNextwatch

Expo-powered movie discovery app.
# appnextwatch

## Supabase setup

1) Create a new Supabase project.
2) In the SQL editor, run `data/supabase/schema.sql`, then `data/supabase/seed.sql`.
3) Copy the project URL + anon key into a local `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4) Install dependencies: `npm install`
5) Run the app: `npm start`
