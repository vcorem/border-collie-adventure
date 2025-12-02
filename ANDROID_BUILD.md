# Building Border Collie Adventure for Android

This guide explains how to build an Android APK from the Border Collie Adventure game.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17+** - Usually included with Android Studio
3. **Node.js** - Already installed in Replit

## Option 1: Build Locally with Android Studio

### Step 1: Clone the Repository
```bash
git clone https://github.com/vcorem/border-collie-adventure.git
cd border-collie-adventure
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Web App
```bash
npm run build
```

### Step 4: Sync with Android
```bash
npx cap sync android
```

### Step 5: Open in Android Studio
```bash
npx cap open android
```

### Step 6: Build the APK
1. Wait for Gradle to sync (bottom-right progress bar)
2. Go to **Build > Build Bundle(s)/APK(s) > Build APK(s)**
3. Wait for the build to complete
4. Click **Locate** to find your APK

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Option 2: Build Using GitHub Actions (Cloud Build)

You can set up GitHub Actions to automatically build APKs. Add this file to your repository:

### `.github/workflows/android.yml`
```yaml
name: Build Android APK

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Setup Java
      uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build web app
      run: npm run build
    
    - name: Sync Capacitor
      run: npx cap sync android
    
    - name: Build APK
      run: |
        cd android
        chmod +x gradlew
        ./gradlew assembleDebug
    
    - name: Upload APK
      uses: actions/upload-artifact@v4
      with:
        name: app-debug
        path: android/app/build/outputs/apk/debug/app-debug.apk
```

After pushing this file, go to your GitHub repository's **Actions** tab to download the APK.

## Option 3: Use a Cloud Build Service

### Appflow (Ionic)
- https://ionic.io/appflow
- Connects to GitHub and builds APKs in the cloud

### Codemagic
- https://codemagic.io
- Free tier available for personal projects

## Installing the APK on Your Phone

1. Transfer the APK file to your Android device
2. On your phone, go to **Settings > Security**
3. Enable **Install from unknown sources** (or **Install unknown apps**)
4. Open the APK file to install
5. Find "Border Collie Adventure" in your app drawer

## App Details

- **Package ID**: com.bordercollie.adventure
- **App Name**: Border Collie Adventure
- **Minimum Android**: API 22 (Android 5.1 Lollipop)

## Troubleshooting

### Blank screen after opening app
Run these commands and rebuild:
```bash
npm run build
npx cap sync android
```

### Gradle sync failed
- Update Android Studio to the latest version
- Install Android SDK 33 or higher

### APK won't install
- Enable "Install from unknown sources" on your device
- Make sure you're installing the correct architecture (most phones are arm64)
