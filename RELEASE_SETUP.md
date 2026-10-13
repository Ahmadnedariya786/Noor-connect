# Fixed Signing Key Setup for Noor Connect (Nightly Builds)

## Overview & Goal

In Android, updates to an installed application **must** be signed with the exact same cryptographic signing key as the currently installed APK. 

Previously, builds without a persistent signing key generated ephemeral or varying debug signatures. When users downloaded a new nightly build, Android rejected the update with an installation conflict error, requiring a manual uninstall and reinstall (which wiped local settings, prayer records, and offline cache).

By configuring a **fixed, stable signing key** stored securely in GitHub Secrets, all automated nightly releases are signed with one consistent identity. **Users can now seamlessly update without uninstalling.**

---

## 🔐 Required GitHub Secrets

Configure the following **4 repository secrets** in GitHub:

1. Navigate to: **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each item below:

| Secret Name | Value Description | Recommended / Generated Value |
| :--- | :--- | :--- |
| `KEYSTORE_BASE64` | Base64-encoded content of the `.keystore` file | *(Paste the base64 string below)* |
| `KEYSTORE_STORE_PASS` | Keystore password | `noor123connect` |
| `KEYSTORE_KEY_PASS` | Private key alias password | `noor123connect` |
| `KEYSTORE_ALIAS` | Private key alias | `noor-connect` |

---

### `KEYSTORE_BASE64` Value

Copy the complete string below and paste it as the secret value for `KEYSTORE_BASE64`:

```text
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
```

---

## 🛠️ How It Works in CI/CD

In `.github/workflows/nightly-apk.yml`:

1. **Secret Validation**: Fails fast if any of the 4 secrets are not defined.
2. **Decode Keystore**: The pipeline executes:
   ```bash
   echo "$KEYSTORE_BASE64" | base64 -d > android/app/release.keystore
   ```
3. **Assemble Release**: Runs Gradle release build with the signing credentials:
   ```bash
   ./gradlew assembleRelease --no-daemon
   ```
4. **Local Fallback**: If building locally without these environment variables or without `release.keystore`, `android/app/build.gradle` safely falls back to standard debug signing so local workflows never break.

---

## ⚠️ Security Notes

- Keystore files (`*.keystore`, `keystore.txt`) are ignored by `.gitignore` and must **never** be committed to source control.
- Backup the `noor-connect-release.keystore` file in a secure location (e.g. password manager or offline secure drive) to ensure signing continuity.
