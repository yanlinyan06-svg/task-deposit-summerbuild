# Task Deposit

Task Deposit is a productivity app that turns distracting app opens into short study checkpoints. Students upload lecture notes or learning material, Reka AI generates a quick task, and the user must deposit a typed or handwritten attempt before the blocked app unlocks.

The current Expo Go build is a polished demo of the full flow:

- Upload learning material with Expo DocumentPicker.
- Generate study prompts through the FastAPI + Reka backend.
- Simulate opening blocked apps such as Instagram, TikTok, YouTube, and games.
- Submit a typed attempt or snap a handwritten proof with Expo Camera.
- Use Reka vision to reject blank, random, or spam images while allowing imperfect real attempts.

## Tech Stack

- Expo SDK 54, React Native 0.81, Expo Router
- Expo Camera and Expo DocumentPicker
- FastAPI backend
- Reka AI for prompt generation and proof validation
- EAS-ready app configuration for iOS and Android builds

## Run The App

```bash
npm install
npx expo start
```

Open the project in Expo Go for the demo flow.

## Run The Backend

```bash
cd taskdeposit-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set REKA_API_KEY=your_reka_key
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The app currently points at the deployed Render API:

```ts
https://taskdeposit-summerbuild.onrender.com
```

Change `API_BASE_URL` in `app/(tabs)/index.tsx` if you want to test against a local backend.

## Independent iOS And Android Builds

Expo Go cannot directly control Apple Screen Time or Android app blocking APIs because those require native entitlements and platform-specific services. The project is structured so the demo can become an independent app through development builds:

- iOS: add a native module using FamilyControls, DeviceActivity, and ManagedSettings.
- Android: add a native module using UsageStats permission and an Accessibility service.
- Expo: use EAS development/production builds instead of Expo Go once those native modules are added.

The in-app blocked-app simulator is intentional for the hackathon presentation: it demonstrates the user experience while keeping the Expo Go build testable.
