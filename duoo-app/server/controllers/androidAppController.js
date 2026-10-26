const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const releaseDirectory = path.join(__dirname, '..', 'releases');
const defaultManifestPath = path.join(releaseDirectory, 'android-latest.json');
const defaultApkPath = path.join(releaseDirectory, 'duoo-capture.apk');

function readManifest() {
    const manifestPath = process.env.ANDROID_RELEASE_MANIFEST || defaultManifestPath;
    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch {
        return {};
    }
}

function localApkPath() {
    return path.resolve(process.env.ANDROID_APK_PATH || defaultApkPath);
}

function externalDownloadUrl() {
    const value = process.env.ANDROID_APK_URL?.trim();
    if (!value) return null;
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' ? parsed.toString() : null;
    } catch {
        return null;
    }
}

function sha256(filePath) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
}

exports.latest = (req, res) => {
    const manifest = readManifest();
    const apkPath = localApkPath();
    const hasLocalApk = fs.existsSync(apkPath) && fs.statSync(apkPath).isFile();
    const externalUrl = externalDownloadUrl();
    const available = hasLocalApk || Boolean(externalUrl);
    const versionCode = Number(process.env.ANDROID_VERSION_CODE || manifest.versionCode || 1);
    const currentVersionCode = Number(req.query.currentVersionCode || 0);

    const downloadUrl = available
        ? externalUrl || '/api/app/android/download'
        : null;

    res.set('Cache-Control', 'public, max-age=300');
    return res.json({
        platform: 'android',
        appId: 'com.duoo.capture',
        available,
        updateAvailable: available && Number.isFinite(currentVersionCode) && currentVersionCode < versionCode,
        versionCode,
        versionName: String(process.env.ANDROID_VERSION_NAME || manifest.versionName || '0.1.0'),
        minimumVersionCode: Number(process.env.ANDROID_MINIMUM_VERSION_CODE || manifest.minimumVersionCode || 1),
        mandatory: process.env.ANDROID_RELEASE_MANDATORY
            ? process.env.ANDROID_RELEASE_MANDATORY === 'true'
            : Boolean(manifest.mandatory),
        releaseNotes: Array.isArray(manifest.releaseNotes) ? manifest.releaseNotes : [],
        publishedAt: manifest.publishedAt || null,
        downloadUrl,
        sha256: hasLocalApk ? sha256(apkPath) : manifest.sha256 || null
    });
};

exports.download = (req, res) => {
    const externalUrl = externalDownloadUrl();
    if (externalUrl) return res.redirect(302, externalUrl);

    const apkPath = localApkPath();
    if (!fs.existsSync(apkPath) || !fs.statSync(apkPath).isFile()) {
        return res.status(404).json({ error: 'APK ainda não publicado' });
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.set('Content-Type', 'application/vnd.android.package-archive');
    return res.download(apkPath, 'duoo-capture.apk');
};

module.exports._private = { readManifest, localApkPath, externalDownloadUrl };
