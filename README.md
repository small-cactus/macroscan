# MacroScan

MacroScan is an Expo / React Native nutrition scanning app. The active app lives at the repository root. The nested `MacroScan/` directory is an older Expo scaffold retained for reference only.

## Verified Setup

Tested on macOS with Node `22.12.0` and npm `10.x`.

1. Install dependencies:

   ```bash
   npm ci --legacy-peer-deps
   ```

2. Copy the environment template and fill in the Firebase and Brave Search values:

   ```bash
   cp .env.example .env
   ```

3. Start the Expo app:

   ```bash
   npm run start
   ```

## Verified Checks

The following checks were used to validate this repo during public-readiness cleanup:

```bash
npx expo export --platform web
npx jest --runInBand --watchman=false
```

## Required Environment Variables

The app now expects these Expo public variables:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_BRAVE_SEARCH_API_KEY`

`firebaseConfig.js` uses safe placeholders when these values are missing so the repo can clone and bundle cleanly, but auth and web-search functionality will not work until real values are supplied.

## Notes

- `AuthContext.js` depends on Firebase auth and will fail functional sign-in/sign-out flows until the Firebase values above are configured.
- The web search feature depends on Brave Search and now reads its key from `EXPO_PUBLIC_BRAVE_SEARCH_API_KEY` instead of a committed secret.
- `.expo/`, `.DS_Store`, recovered plist snapshots, and similar machine-local artifacts are intentionally excluded from the public repo.

## Legacy Material

- `README_VISUALIZATION.md` documents a visualization subsystem and is left intact.
- `MacroScan/` is an older scaffold and is not the app entrypoint for current development.
