# Native Google Sign-In — Setup Checklist

Web Google + email/PIN work without these steps. Complete them to enable Google
Sign-In in the Android and iOS builds. The app uses
`@capacitor-firebase/authentication@6.3.1` (Capacitor 6 compatible).

## Firebase console
- [ ] Authentication → Sign-in method → enable **Email/Password**.
- [ ] Authentication → Sign-in method → enable **Google**. Note the **Web client ID**.

## Android
- [ ] Get the signing SHA-1 (and SHA-256):
      `cd android && ./gradlew signingReport`
- [ ] Firebase console → Project settings → your Android app → add the SHA-1/SHA-256.
- [ ] Download the updated `google-services.json` into `android/app/`.
- [ ] `npx cap sync android`

## iOS
- [ ] Download `GoogleService-Info.plist` into the iOS app target.
- [ ] In `Info.plist`, add a URL scheme equal to the **REVERSED_CLIENT_ID** from
      `GoogleService-Info.plist`.
- [ ] `npx cap sync ios`

## Verify
- [ ] Android device/emulator: "Continue with Google" opens the native chooser and returns to the app signed in.
- [ ] iOS device/simulator: same.
- [ ] Web: "Continue with Google" opens the popup and returns signed in.

## Notes
- The `@capacitor-firebase/authentication` plugin lists `firebase` peer `^10 || ^11`
  while this project uses Firebase 12. That is only a peer-range warning: on web we
  call the standard `signInWithCredential`/`signInWithPopup`, and on native the plugin
  bridges the native Firebase SDKs (configured via `google-services.json` /
  `GoogleService-Info.plist`), independent of the JS `firebase` version.
