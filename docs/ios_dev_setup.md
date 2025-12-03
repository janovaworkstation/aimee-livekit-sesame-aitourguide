# AImee iOS Development & Deployment Guide

## For Expo + EAS + Dev Client + Ngrok + Local Docker Backend

## Overview

This guide documents the complete setup required to run the AImee Travel Companion app on an iOS device using:

- Expo Dev Client
- EAS build system
- Local Docker backend (backend + agent)
- Optional ngrok tunneling for external testers
- Smooth hot-reloading for day-to-day development

This is the recommended workflow for developing AImee on a physical iPhone.

## 1. Project Structure Overview

Key folders:

```text
aimee-livekit-sesame-aitourguide/
  mobile/        ← Expo/React Native app
  docker/        ← Backend + Agent containers
  docs/          ← Documentation
  .env           ← Root-level env file (backend/agent use this)
  docker-compose.yml
```

Backend & Agent run in Docker.
The mobile app connects to them via local IP or ngrok during development.

## 2. One-Time Prerequisites

Before building the iOS app for the first time:

### Install tools

```bash
npm install -g eas-cli
brew install ngrok
```

### Log into Expo

```bash
eas login
```

### Apple Developer setup

Visit App Store Connect and ensure:

- All updated Apple agreements are accepted
- EU Trader Status is set (Digital Services Act requirement)
- You are logged in as the Account Holder or have appropriate roles

**You cannot build for iOS until these are accepted.**

## 3. Configure the Expo App

In `mobile/app.json`, AImee must have:

- Correct iOS bundle identifier
- Plugins required for LiveKit, WebRTC, and Location
- Permissions for microphone & location
- dev-client plugin enabled

### Example (yours)

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.virel.aimee",
  "infoPlist": {
    "NSLocationWhenInUseUsageDescription": "AImee needs location access..."
  }
}
```

## 4. Configure eas.json

Run:

```bash
cd mobile
eas build:configure
```

Ensure the development profile contains:

```json
"development": {
  "developmentClient": true,
  "distribution": "internal"
}
```

This tells Expo that the iOS build should produce a dev client, not a pure production app.

## 5. Build & Install the Dev Client (One-Time Step)

From the mobile folder:

```bash
eas build --profile development --platform ios
```

When the build completes:

1. Open the build link in Safari on your iPhone
2. Tap "Install"
3. The app appears on your home screen as **AImee POC**

This is your permanent development shell.
**You will NOT need to rebuild it for every code change.**

## 6. Day-to-Day Development Workflow

This is your new 2-terminal daily workflow.

### Terminal 1 — run backend + agent

From the project root:

```bash
cd /Users/jlusenhop/Developer/aimee-livekit-sesame-aitourguide
docker compose up
```

**Use --build only if backend code changed.**

### Terminal 2 — start Expo dev server for the dev client

From the mobile folder:

```bash
cd /Users/jlusenhop/Developer/aimee-livekit-sesame-aitourguide/mobile
npx expo start --dev-client
```

### On your iPhone

- Open **AImee POC** (not Expo Go)
- If it doesn't connect:
  - Kill the app
  - Scan the QR code from the Metro bundler
  - Tap to open in the dev client

From this point forward, every JS/TS change hot-reloads directly into your installed dev app.

### You do NOT run

- `npx expo run:ios`
- The simulator (unless testing there specifically)
- Expo Go (not needed anymore)

## 7. Optional — Reset Metro Bundler Cache

Only use this when debugging stale bundles or odd errors:

```bash
npx expo start --dev-client --clear
```

## 8. Backend access for testers (ngrok)

If other testers install the app, they need access to your backend.

### Step 1 — Run backend locally

```bash
docker compose up
```

### Step 2 — Start ngrok

```bash
ngrok http 3000
```

It prints something like:

```text
https://1e039b0f144b.ngrok-free.app → http://localhost:3000
```

### Step 3 — Configure mobile app to use this URL

In your `.env` (root), set:

```env
BACKEND_URL=https://1e039b0f144b.ngrok-free.app
```

Then restart:

- Docker containers
- Expo dev server
- The AImee app

### When testers use TestFlight or their own dev build

They will hit the ngrok URL automatically.

## 9. When You **Do** Need to Rebuild with EAS

You must rebuild using EAS when:

- You change native dependencies (LiveKit, WebRTC)
- You change app.json (icons, bundle identifier, permissions)
- You need a TestFlight build
- You add/remove Expo plugins

You do **NOT** need to rebuild for:

- UI changes
- Prompt changes
- Business logic / agent logic changes
- Audio pipeline tweaks inside JS/TS
- Memory / state updates
- Most backend config

## 10. Testing on Long Road Trips

To test while driving:

1. Bring your Mac
2. Connect to personal hotspot or campground WiFi
3. Start:
   - `docker compose up`
   - `npx expo start --dev-client`
4. Open the dev build on your iPhone
5. Optional: run ngrok if you want the app to keep working while the phone and laptop are on different networks

Later, when cloud hosting is set up, you won't need to bring the Mac.

## 11. Summary Cheat Sheet

### One-time

```bash
eas build --profile development --platform ios
```

- Install dev client on iPhone
- Accept Apple agreements

### Everyday

- **Terminal 1** → `docker compose up`
- **Terminal 2** → `npx expo start --dev-client`
- Open **AImee POC** on iPhone

### For testers

```bash
ngrok http 3000
```

- Set `BACKEND_URL` to ngrok URL
- Build TestFlight app
