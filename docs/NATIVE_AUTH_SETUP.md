# Native Google Sign-In — Setup Checklist

Web Google + email/PIN work without these steps. Complete them to enable Google
Sign-In in the **Android** and **iOS** builds. The app uses
`@capacitor-firebase/authentication@6.3.1` (Capacitor 6 compatible).

**Important:** the app's package/bundle id is **`com.finwise.app`** (in
`capacitor.config.ts` → `appId`). The Firebase Android app and iOS app MUST use
this exact id, even though the display name is "PesaFlow". Do not change `appId`
— it's what ties the app to Firebase. (Display name lives in
`android/.../res/values/strings.xml` and `ios/App/App/Info.plist`.)

## 1. Firebase console (once)
- [ ] Authentication → Sign-in method → enable **Email/Password**.
- [ ] Authentication → Sign-in method → enable **Google**. Note the **Web client ID**.

## 2. Android
- [ ] Firebase console → Project settings → **Add app → Android**, package name
      **`com.finwise.app`** (if it doesn't already exist).
- [ ] Get the signing SHA-1 (and SHA-256) and add **both** in the Firebase Android app
      (Project settings → your Android app → *Add fingerprint*):
      - Debug keystore: `cd android && ./gradlew signingReport` → copy the **SHA1** of the `debug` variant.
      - Release keystore (if you ship a signed release APK — this is the usual cause of
        "Google sign-in fails / DEVELOPER_ERROR code 10"):
        `keytool -list -v -keystore <your-release.keystore> -alias <alias>`
- [ ] Download the updated **`google-services.json`** and place it at
      **`android/app/google-services.json`** (the Gradle build only wires Firebase when
      this file is present — without it Google Sign-In cannot initialize).
- [ ] Rebuild:
      ```
      npm run build && npx cap sync android
      cd android && ./gradlew assembleRelease   # or assembleDebug / build in Android Studio
      ```

## 3. iOS
- [ ] Firebase console → Project settings → **Add app → iOS**, bundle id
      **`com.finwise.app`**.
- [ ] Download **`GoogleService-Info.plist`** and add it to the **App target** in Xcode
      (drag into `ios/App/App/`, tick "Copy items if needed" + the *App* target).
- [ ] Open `GoogleService-Info.plist`, copy the **`REVERSED_CLIENT_ID`** value
      (looks like `com.googleusercontent.apps.1234567890-abcdefg`).
- [ ] In `ios/App/App/Info.plist`, replace the placeholder **`REPLACE_WITH_REVERSED_CLIENT_ID`**
      (inside the `CFBundleURLTypes` block that's already there) with that value.
- [ ] Rebuild:
      ```
      npm run build && npx cap sync ios
      npx cap open ios   # then Run/Archive in Xcode
      ```

## 4. Verify
- [ ] Android device/emulator: "Continue with Google" opens the native chooser and returns to the app signed in.
- [ ] iOS device/simulator: same.
- [ ] Web: "Continue with Google" opens the popup and returns signed in.

## Troubleshooting
- **Android "Google sign-in failed" / error code 10 (DEVELOPER_ERROR):** the SHA-1 of
  the keystore that signed the installed APK is not registered in Firebase. Add it and
  re-download `google-services.json`.
- **Nothing happens / Firebase not initialized on Android:** `google-services.json` is
  missing from `android/app/`.
- **iOS returns to Safari / doesn't come back to the app:** the `REVERSED_CLIENT_ID`
  URL scheme in `Info.plist` is missing or wrong, or `GoogleService-Info.plist` isn't
  added to the App target.

## Notes
- The `@capacitor-firebase/authentication` plugin lists `firebase` peer `^10 || ^11`
  while this project uses Firebase 12. That is only a peer-range warning: on web we
  call the standard `signInWithCredential`/`signInWithPopup`, and on native the plugin
  bridges the native Firebase SDKs (configured via `google-services.json` /
  `GoogleService-Info.plist`), independent of the JS `firebase` version.
- Renaming the display name to "PesaFlow" does not affect Firebase — only `appId`
  (`com.finwise.app`) matters for the Firebase link.
