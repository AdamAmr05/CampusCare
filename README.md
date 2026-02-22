# React Native (Expo) Setup

This directory is scaffolded for an Expo React Native app.

## Install dependencies

From this folder:

```bash
npm install
```

## Upgrade to SDK 54 compatibility

The app is now aligned to SDK 54 (to match Expo Go 54.x):

- `expo` `^54.0.0`
- `react` `19.1.0`
- `react-native` `0.81.0`
- `expo-status-bar` `^3.0.8`

## Run the app

- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`
- Start only: `npm run start`

## Security audit

Run:

```bash
npm install
npm audit
npm audit fix
```

If `npm install` / `npm audit` cannot reach `registry.npmjs.org`, run them on a machine with network access.

> Network access is required for dependency install and audit metadata.
