# 🛠️ Building Signed APKs

This project provides two ways to build signed APKs:

## 📋 Prerequisites

1. **GitHub Account** with repository access
2. **GitHub Actions** enabled for your repository
3. **Keystore secrets** configured in your repository

## 🔐 Setup Secret Instructions

### 1. Create Secrets in GitHub

Navigate to: **Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Description | How to get |
| --- | --- | --- |
| `KEYSTORE_BASE64` | Your keystore file (base64 encoded) | Use `base64 -w 0 <your-keystore.jks>` |
| `KEYSTORE_PASSWORD` | Keystore password | Your keystore password |
| `KEY_ALIAS` | Key alias | Your key alias |
| `KEY_PASSWORD` | Key password | Your key password |

### 2. Convert Keystore to Base64

```bash
# On your local machine
cd /path/to/your/keystore
base64 -w 0 noorconnectjks > keystore-base64.txt

# Copy the output and add to KEYSTORE_BASE64 secret
```

## 🚀 Build Workflows

### 1. Nightly Build Factory (Automated Continuous APK)

The nightly workflow runs automatically on every push to `main` (and via manual `workflow_dispatch`):

- **Workflow:** `.github/workflows/nightly-apk.yml`
- **Output:** Fixed GitHub Release tagged `nightly` with `noor-connect-nightly.apk`.
- **In-App Integration:** Noor Connect automatically checks this release and notifies users when an update is available.

### 2. Tagged Signed Release Workflow

The release workflow runs when tags are pushed (`refs/tags/*`) or manually triggered:

- **Repository Workflow:** `.github/workflows/build-apks-signed.yml`

## 📦 Build Outputs

The workflow produces two APK variants:

1. **Standard Release APK**
   - Path: `android/app/build/outputs/apk/release/app-release.apk`
   - Includes all Google Play services

2. **F-Droid Release APK**
   - Path: `android/app/build/outputs/apk/fossRelease/app-fossRelease.apk`
   - Pure FOSS, no proprietary Google dependencies

## 📦 Artifact & Release Management

### GitHub Artifacts

- Uploaded automatically after successful build
- Available for 30 days
- Can be downloaded from Actions tab

### GitHub Releases

- Automatically created for each tag push
- Includes both APK variants as release assets
- Named: `noor-connect-<version>-standard.apk` and `noor-connect-<version>-fdroid.apk`

## 🔍 Troubleshooting

### Common Issues

1. **Keystore not found**
   - Verify `KEYSTORE_BASE64` contains valid base64 data
   - Check file permissions: `chmod 600 android/keystore/noorconnectjks`

2. **Build failing with signing errors**
   - Ensure keystore secrets match your local keystore
   - Verify all passwords are correct

3. **No artifacts uploaded**
   - Check GitHub Actions logs for build output
   - Verify workflow runs completed successfully

### Debug Commands

```bash
# Check if keystore was decoded correctly
cd android
ls -la keystore/

# Check local.properties content
cat local.properties

# Manually test build
cd android
./gradlew assembleRelease
./gradlew assembleRelease -Pfoss=true
```

## 🤝 Contributing

1. Fork the repository
2. Add your keystore secrets to your fork
3. Push a tag to trigger the build
4. Download artifacts from GitHub Actions or Releases
