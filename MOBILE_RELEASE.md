# FinWise Mobile Release

FinWise is now set up as an installable PWA and a Capacitor mobile app.

## PWA

Build and preview the web app:

```bash
npm run build
npm run preview
```

When deployed over HTTPS, Android Chrome and iOS Safari can install it from the browser using Add to Home Screen.

## Android

The Android project has been generated in `android/`.

Common commands:

```bash
npm run android:sync
npm run android:open
```

In Android Studio:

1. Open the `android/` project.
2. Let Gradle sync.
3. Test on an emulator or real phone.
4. Build a release AAB from Build > Generate Signed Bundle / APK.
5. Upload the AAB to Google Play Console.

App id: `com.finwise.app`
App name: `FinWise`

## iOS

The iOS package is installed, but the native iOS project must be generated on macOS with Xcode installed.

On a Mac:

```bash
npm install
npm run ios:add
npm run ios:open
```

In Xcode:

1. Select your Apple Developer Team.
2. Set signing and bundle settings.
3. Test on simulator or device.
4. Archive and upload to App Store Connect.

## After Web Changes

Whenever you change React code, sync the mobile projects:

```bash
npm run android:sync
npm run ios:sync
```

Only run `ios:sync` on macOS after the iOS project exists.
