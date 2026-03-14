# MacroScan

<p align="center">
  <img src="assets/icon.png" alt="MacroScan app icon" width="140" />
</p>

<p align="center">
  <img src="assets/macroscan-cover.jpg" alt="MacroScan product preview" width="720" />
</p>

<p align="center">
  Camera-first nutrition tracking built with Expo, React Native, and multiple AI analysis providers.
</p>

## Quick Start

1. Create your local environment file.

   ```bash
   cp .env.example .env
   ```

2. Add the required values to `.env`.

   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   EXPO_PUBLIC_FIREBASE_APP_ID=
   EXPO_PUBLIC_BRAVE_SEARCH_API_KEY=
   ```

3. Install dependencies.

   ```bash
   npm ci --legacy-peer-deps
   ```

4. Start the Expo app.

   ```bash
   npm start
   ```

5. Open the app in Expo Go or press `i` / `a` in the Expo terminal to launch a simulator.

## What This Repository Contains

| Path | Purpose |
| --- | --- |
| `App.js` | Application shell, providers, navigation, theme selection, connectivity handling, and paywall setup |
| `screens/` | Product surfaces including scan, history, insights, onboarding, account, and support screens |
| `screens/providers/` | Provider-specific scan handlers, model selection, and search-backed analysis logic |
| `contexts/` | Shared app services such as hidden web scraping, scan status, and time zone handling |
| `userContext.js` | User provisioning and API-key retrieval through the hosted backend function |
| `ios/` / `android/` | Native projects generated for the Expo app |
| `__tests__/` | Jest setup and screen-level test scaffolding |
| `README_VISUALIZATION.md` | Focused notes for the visualization subsystem used by search-assisted scans |

The active mobile app lives at the repository root. The nested `MacroScan/` directory is an older scaffold preserved as reference material.

## Product Overview

MacroScan is a mobile nutrition workflow centered on image capture. A user can photograph food, submit it to one of several AI providers, review structured nutrition output, save the result, and use that saved history to drive trend and insight screens later in the app.

The current application is organized around five primary tabs declared in `App.js`:

| Tab | Screen | Role |
| --- | --- | --- |
| Home | `FoodScanScreen` | Main image capture, scan-mode selection, and result generation flow |
| Insights | `InsightsV2` | Trend views and summary analytics built from saved scan data |
| History | `HistoryScreen` | Timeline of past scans and saved nutrition results |
| Settings | `SettingsScreen` | Feature toggles, provider settings, and account-related app preferences |
| Profile | `ProfileScreen` | User profile data and saved account state |

The stack navigator adds onboarding, auth, support, migration, food detail, and debugging routes on top of that tab shell.

## How The App Works

### Scan pipeline

`screens/FoodScanScreen.js` is the center of the product. It coordinates:

- camera capture and image-picker intake
- manual food description fallback
- barcode and multi-food paths
- mode selection for `fast`, `accurate`, and `search`
- provider and model selection through `screens/providers/models.js`
- loading, progress, and review-prompt UI
- paywall and entitlement checks before premium scan paths

### Provider routing

The scan flow delegates work to provider modules in `screens/providers/`. The code maps scan modes onto different model families, allowing the same UI to switch between:

- OpenAI-backed analysis
- Gemini-backed analysis
- Anthropic-backed analysis

That routing is explicit rather than abstracted away behind a single generic API layer, which keeps the differences between speed-oriented and depth-oriented scan modes visible inside the codebase.

### Search-assisted nutrition analysis

MacroScan also supports a deeper search path. `screens/providers/WebSearchProvider.js` handles the search-backed workflow, while `contexts/WebScraperContext.js` serializes hidden WebView scraping work that feeds additional context into the nutrition result. Brave Search is used as the API-backed search source configured from `.env`.

### Persistence and user state

The app relies heavily on local device persistence. `AsyncStorage` stores scan history, onboarding state, selected provider, selected model, usage counters, feature flags, and pieces of account state that are used to shape the first screen a user sees when the app opens.

Several top-level providers wrap the app:

- `UserProvider` manages user creation, update, deletion, and backend key distribution
- `IAPProvider` manages in-app purchase state
- `TimeZoneProvider` syncs local time-zone information
- `ScanStatusProvider` tracks scan-state signals used across the tab shell
- `WebScraperProvider` coordinates background search and scraping work

### Insights and history

The insights experience is derived from the scan data saved on the device. `screens/InsightsV2.js` and the history/profile screens read persisted user and nutrition records rather than depending on a separate analytics service.

### Monetization

Two monetization layers are wired into the app:

- `react-native-iap` state exposed through `IAPContext`
- Superwall entitlements configured in `App.js`

These are used to control feature access, scan limits, and subscription-aware UI moments in the scan flow.

## Services And Platform Dependencies

MacroScan integrates with:

- Firebase Authentication
- a hosted user-management function exposed as `distributeApiKey`
- Anthropic
- Gemini
- OpenAI
- Brave Search
- Superwall
- Expo device APIs including camera, haptics, image manipulation, secure storage, and web browser utilities

## Build And Run Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Launch the Expo development server |
| `npm run ios` | Run the app in the iOS simulator |
| `npm run android` | Run the app in the Android emulator or connected device |
| `npm run web` | Open the Expo web target |
| `npx expo export --platform ios` | Produce an iOS export bundle |

## Tech Stack

- Expo SDK 51
- React Native 0.74
- React Navigation
- AsyncStorage
- Firebase
- Superwall
- Expo Camera and related native modules

## Additional Notes

- `firebaseConfig.js` reads Firebase values from the Expo public environment variables listed above.
- The provider selection and scan-mode state are persisted locally, so switching modes changes later scans without adding extra navigation steps.
- `README_VISUALIZATION.md` documents the visualization store and search-result progression in more detail.
