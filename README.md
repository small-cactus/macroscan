# MacroScan

<p align="center">
  <img src="assets/icon.png" alt="MacroScan app icon" width="140" />
</p>

<p align="center">
  <img src="assets/macroscan-cover.jpg" alt="MacroScan product preview" width="720" />
</p>

MacroScan is an Expo / React Native nutrition app built around camera-first food analysis. The app lets a user scan food, save results to local history, explore nutrition insights over time, and switch between multiple AI-backed scan modes with different speed/accuracy tradeoffs.

## Repository Layout

The active application lives at the repository root.

- `App.js` wires the app shell, navigation, theme handling, connectivity handling, Superwall configuration, and the main tab structure.
- `screens/` contains the primary product flows: onboarding, scan, history, profile, settings, insights, manual input, camera handoff, and several experimental or support screens.
- `screens/providers/` contains provider-specific scan logic and model selection, including Anthropic, Gemini, OpenAI, processing-time tracking, and web-search-assisted flows.
- `contexts/` and top-level context files (`userContext.js`, `TimeZoneContext.js`, `ScanStatusContext.js`, `IAPContext.js`) manage user data, scan state, time zone state, and purchase/subscription state.
- `ios/` and `android/` contain the native Expo-generated projects.
- `__tests__/` contains Jest-based tests and setup files.
- `MacroScan/` is an older Expo scaffold kept in the repo, but it is not the current application entrypoint.

## How The App Is Structured

At runtime, the app is organized around a tabbed mobile shell with five main tabs:

- `Home`: the main scan flow (`FoodScanScreen`)
- `Insights`: the nutrition insights/dashboard experience (`InsightsV2`)
- `History`: previously scanned foods and results
- `Settings`: app settings and feature toggles
- `Profile`: user/account state and saved information

Navigation outside the tabs includes welcome, sign-in, sign-up, onboarding, profile completion, support/privacy/about, debugging screens, camera entry, food detail views, and migration / no-internet handling.

The app is stateful in two different ways:

- It stores a large amount of user/session data locally with `AsyncStorage`, including scan history, selected provider, API keys, onboarding flags, usage counters, and various UI state flags.
- It also relies on external services for some user creation and auth-related flows. `userContext.js` calls a hosted cloud function (`distributeApiKey`) to create/update/delete users and to retrieve provider keys. `AuthContext.js` separately depends on Firebase auth.

## Core Product Flows

### 1. Food scanning

`screens/FoodScanScreen.js` is the main product surface. It handles:

- camera or image-picker based image input
- barcode-assisted scan flows
- manual input fallback
- multiple scan modes (`fast`, `accurate`, and `search`)
- provider/model selection using `screens/providers/models.js`
- progress/loading states, tooltips, and review prompts
- subscription-aware gating through in-app purchase state and Superwall

### 2. AI provider routing

The scan screen delegates processing to provider handlers in `screens/providers/`.

The model selection logic is explicit:

- `fast` mode defaults to lighter models
- `accurate` mode forces more capable models
- `search` mode uses the provider’s agentic/search-oriented model path

The current model map includes:

- OpenAI
- Gemini
- Anthropic

### 3. Search-assisted analysis

The app includes a deeper search flow that combines AI processing with external web lookup.

- `screens/providers/WebSearchProvider.js` contains the search logic
- `contexts/WebScraperContext.js` manages serialized hidden-webview scraping requests
- Brave Search is used for API-backed search results when configured

This is not just a static nutrition database lookup. The app has an explicit “Deep Search” mode that can gather broader web context and feed that back into the nutrition workflow.

### 4. Insights and history

Insights are built from locally stored scan history rather than a server-backed analytics pipeline.

- `screens/InsightsV2.js` reads saved history and goals, computes trend views, and drives the personalized dashboard/onboarding experience.
- History and profile-related screens read and mutate persisted scan/user state from `AsyncStorage`.

### 5. Monetization and gating

MacroScan includes two separate monetization-related systems in the current code:

- in-app purchase / subscription state through `IAPContext`
- paywall / entitlement handling through Superwall in `App.js` and scan flows

This affects scan limits, feature access, and some prompt/review timing.

## External Services And Dependencies

The codebase currently integrates with several external systems:

- Firebase Auth
- a hosted user-management cloud function (`distributeApiKey`)
- Anthropic
- Brave Search
- Superwall
- Expo / native device APIs (camera, secure store, haptics, image tools, etc.)

The app also stores provider keys in local device storage and expects environment-driven Firebase configuration through `firebaseConfig.js`.

## Environment Variables

Create a local `.env` from the example template:

```bash
cp .env.example .env
```

Required values:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_BRAVE_SEARCH_API_KEY`

If these values are missing, the repo still clones and bundles, but Firebase-backed auth behavior and Brave-backed search features will not function correctly.

## Run Locally

Install dependencies:

```bash
npm ci --legacy-peer-deps
```

Start the Expo development server:

```bash
npm run start
```

Build an iOS JS bundle/export:

```bash
npx expo export --platform ios
```

## Verified Commands

The following commands were run successfully against this repository:

```bash
npm ci --legacy-peer-deps
CI=1 npx expo start --offline
npx expo export --platform ios
```

## Notes

- The root project is the active app. The nested `MacroScan/` folder is legacy.
- The app depends heavily on `AsyncStorage` for user, history, and feature state.
- The codebase includes experimental and debugging-oriented screens alongside the main production flow.
- Jest configuration and test scaffolding exist in the repo, but the runtime path verified here is the Expo start/export flow.

## Additional Reference

`README_VISUALIZATION.md` documents the visualization subsystem separately and remains as supporting reference material.
