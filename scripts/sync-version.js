import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const getGitCommit = () => {
    if (process.env.VITE_BUILD_COMMIT) return process.env.VITE_BUILD_COMMIT.trim();
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.trim();
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
};

// Sync versions between package.json and android/app/build.gradle
function syncVersion() {
    try {
        const pkgPath = path.join(rootDir, 'package.json');
        const gradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
        const versionJsonPath = path.join(rootDir, 'public', 'version.json');

        if (!fs.existsSync(pkgPath) || !fs.existsSync(gradlePath)) {
            console.log('Skipping version sync: package.json or build.gradle not found');
            return;
        }

        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const version = pkg.version;
        
        let gradleContent = fs.readFileSync(gradlePath, 'utf8');
        let updated = false;

        // Update versionName
        const versionNameRegex = /versionName\s+"[^"]+"/;
        const newVersionName = `versionName "${version}"`;
        if (versionNameRegex.test(gradleContent)) {
            const current = gradleContent.match(versionNameRegex)[0];
            if (current !== newVersionName) {
                gradleContent = gradleContent.replace(versionNameRegex, newVersionName);
                updated = true;
                console.log(`Updated versionName to ${version}`);
            }
        }

        // Auto-increment versionCode if version changed
        if (updated) {
            const versionCodeRegex = /versionCode\s+(\d+)/;
            const match = gradleContent.match(versionCodeRegex);
            if (match) {
                const currentCode = parseInt(match[1]);
                const newCode = currentCode + 1;
                gradleContent = gradleContent.replace(versionCodeRegex, `versionCode ${newCode}`);
                console.log(`Incremented versionCode to ${newCode}`);
            }
        }

        if (updated) {
            fs.writeFileSync(gradlePath, gradleContent);
            console.log('Successfully synced Android versions with package.json');
        } else {
            console.log('Versions are already in sync.');
        }

        // Always sync public/version.json for rate-limit-proof updater fallback
        const commit = getGitCommit();
        const versionData = {
            version,
            commit,
            shortCommit: commit.length >= 7 ? commit.slice(0, 7) : commit,
            builtAt: new Date().toISOString(),
            apkUrl: 'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/nightly/noor-connect-nightly.apk',
        };
        fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });
        fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
        console.log(`Updated public/version.json (commit: ${versionData.shortCommit})`);

    } catch (error) {
        console.error('Error syncing versions:', error);
    }
}

syncVersion();
