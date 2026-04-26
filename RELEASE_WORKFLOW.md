# AppNextwatch Release Workflow

This file is the practical reference for shipping changes to the iOS app.

Current release setup:

- App: `AppNextwatch`
- iOS bundle ID: `com.anonymous.AppNextwatch`
- EAS build profile: `production`
- EAS update channel: `production`
- Runtime policy in `app.json`: `appVersion`

## 1. Two release paths

There are two different ways to ship changes:

1. `OTA update`
- Use this for normal JavaScript / React Native app changes.
- This does **not** require a new TestFlight build.

2. `Native build + submit`
- Use this when the installed binary itself must change.
- This **does** require a new TestFlight build.

## 2. Use `eas update` for these changes

Run an OTA update for changes like:

- screen UI changes
- styling changes
- copy/text changes
- JavaScript logic changes
- navigation changes
- most app behavior changes that stay inside JS
- bug fixes that do not touch native config/packages

Command:

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx eas-cli update --branch production --message "describe the change"
```

Example:

```bash
npx eas-cli update --branch production --message "session player UI polish"
```

## 3. Use `build + submit` for these changes

Create a new TestFlight build for changes like:

- Expo SDK upgrade
- adding/removing native packages
- changing `app.json` native config
- changing iOS permissions
- changing bundle identifier
- changing plugins in `app.json`
- anything that affects the native iOS container
- any change where OTA is not enough

Commands:

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production --latest --wait
```

If you want to submit a specific build instead of the latest:

```bash
npx eas-cli submit -p ios --id <BUILD_ID> --profile production --wait
```

## 4. Rule of thumb

Use this decision rule:

- `JS/UI/logic only` -> `eas update`
- `native/config/runtime change` -> `eas build` + `eas submit`

## 5. Important constraint in this app

This app uses:

```json
"runtimeVersion": {
  "policy": "appVersion"
}
```

That means:

- OTA updates work only for builds compatible with the same runtime/app version
- if native/runtime compatibility changes, make a new build

## 6. Production env note

The production EAS environment must contain at least:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

These are already configured in EAS production env.

Also note:

- `EXPO_PUBLIC_*` env vars must be accessed with direct `process.env.EXPO_PUBLIC_*` references
- dynamic lookup like `process.env[key]` breaks Expo production env inlining

## 7. OpenAI note

Do **not** ship `EXPO_PUBLIC_OPENAI_API_KEY` in TestFlight production builds.

Reason:

- `EXPO_PUBLIC_*` values are client-visible
- they can be extracted from the app

Preferred pattern:

- client -> Supabase Edge Function -> OpenAI

## 8. If `eas submit` fails

If build succeeds but submit fails repeatedly:

1. retry once later
2. if it still fails, use a fallback uploader path

Fallback options:

1. Apple Transporter
2. `fastlane pilot`

This is a submit-pipeline problem, not necessarily an app problem.

## 9. Daily practical workflow

Most common case:

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx eas-cli update --branch production --message "describe the change"
```

Less common case, when native build is required:

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production --latest --wait
```

## 10. Before a production build

Recommended checks:

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx expo-doctor
```

If `expo-doctor` is clean, then build.

## 11. OTA pre-publish checklist

Before running `eas update`, check these things:

1. Confirm the change is actually OTA-safe
- only JS / UI / logic / navigation changes
- no native package, plugin, permission, or runtime change

2. Check the current app workspace state

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
git status --short
```

- remember: `eas update` publishes the current app bundle state
- if unrelated app changes are sitting in the workspace, they can go live too

3. Use a clear update message
- bad: `fixes`
- good: `sessions calendar legend and retro logging`

4. If the change is broad, do a quick syntax/health check first

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx expo-doctor
```

5. Then publish

```bash
cd /Users/mridulpant/Documents/DevFiles/appnextwatch
npx eas-cli update --branch production --message "describe the change"
```

## 12. How to verify OTA on iPhone

After publishing an OTA update:

1. Wait briefly for the update to be available
- usually this is fast, but give it a short moment

2. Fully close the app on iPhone
- swipe it away from the app switcher

3. Reopen the app
- Expo Updates checks on launch

4. If the change does not appear immediately
- close the app again
- reopen once more after a short wait

5. Verify the specific changed surface
- go directly to the screen you changed
- do not assume the update failed just because the home screen looks the same

6. If the OTA still does not appear
- confirm the installed TestFlight build is on the same runtime
- current runtime policy is `appVersion`, so OTA applies only to compatible binaries

## 13. Safe release habit

Use this habit to avoid accidental pushes:

1. finish the intended app change
2. run `git status --short`
3. make sure you understand what app code is currently modified
4. publish with a specific message
5. verify on phone immediately

This matters because OTA is fast, but it is also easy to ship more than intended if the app workspace is carrying unrelated unfinished edits.
