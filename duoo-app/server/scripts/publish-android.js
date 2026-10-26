const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [sourceArgument, versionCodeArgument, versionName, ...notes] = process.argv.slice(2);
const versionCode = Number(versionCodeArgument);

if (!sourceArgument || !Number.isInteger(versionCode) || versionCode < 1 || !versionName) {
    console.error('Uso: npm run publish:android -- <arquivo.apk> <versionCode> <versionName> [nota da versão]');
    process.exit(1);
}

const source = path.resolve(sourceArgument);
if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    console.error(`APK não encontrado: ${source}`);
    process.exit(1);
}

const header = Buffer.alloc(4);
const descriptor = fs.openSync(source, 'r');
fs.readSync(descriptor, header, 0, header.length, 0);
fs.closeSync(descriptor);
if (header[0] !== 0x50 || header[1] !== 0x4b) {
    console.error('O arquivo informado não tem o formato ZIP/APK esperado.');
    process.exit(1);
}

const releaseDirectory = path.join(__dirname, '..', 'releases');
const destination = path.join(releaseDirectory, 'duoo-capture.apk');
const temporaryDestination = `${destination}.tmp`;
fs.mkdirSync(releaseDirectory, { recursive: true });
fs.copyFileSync(source, temporaryDestination);
fs.renameSync(temporaryDestination, destination);

const sha256 = crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
const manifest = {
    versionCode,
    versionName,
    minimumVersionCode: 1,
    mandatory: false,
    publishedAt: new Date().toISOString(),
    releaseNotes: notes.length ? [notes.join(' ')] : [],
    sha256
};
fs.writeFileSync(path.join(releaseDirectory, 'android-latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Duoo Capture ${versionName} publicado em ${destination}`);
