const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../controllers/androidAppController');

function responseRecorder() {
    const result = { statusCode: 200, body: null, headers: {} };
    result.response = {
        set(name, value) {
            result.headers[name] = value;
            return this;
        },
        status(code) {
            result.statusCode = code;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        },
        redirect(code, url) {
            result.statusCode = code;
            result.redirectUrl = url;
            return this;
        }
    };
    return result;
}

test('latest Android release reports availability and update status for an HTTPS artifact', () => {
    const previous = {
        url: process.env.ANDROID_APK_URL,
        code: process.env.ANDROID_VERSION_CODE,
        name: process.env.ANDROID_VERSION_NAME
    };
    process.env.ANDROID_APK_URL = 'https://downloads.example.com/duoo-capture.apk';
    process.env.ANDROID_VERSION_CODE = '3';
    process.env.ANDROID_VERSION_NAME = '0.3.0';

    try {
        const result = responseRecorder();
        controller.latest({
            query: { currentVersionCode: '2' }, protocol: 'https', get: () => 'api.example.com'
        }, result.response);

        assert.equal(result.statusCode, 200);
        assert.equal(result.body.available, true);
        assert.equal(result.body.updateAvailable, true);
        assert.equal(result.body.versionCode, 3);
        assert.equal(result.body.versionName, '0.3.0');
        assert.equal(result.body.downloadUrl, process.env.ANDROID_APK_URL);
    } finally {
        if (previous.url === undefined) delete process.env.ANDROID_APK_URL;
        else process.env.ANDROID_APK_URL = previous.url;
        if (previous.code === undefined) delete process.env.ANDROID_VERSION_CODE;
        else process.env.ANDROID_VERSION_CODE = previous.code;
        if (previous.name === undefined) delete process.env.ANDROID_VERSION_NAME;
        else process.env.ANDROID_VERSION_NAME = previous.name;
    }
});

test('download rejects non-HTTPS external artifact URLs', () => {
    const previousUrl = process.env.ANDROID_APK_URL;
    const previousPath = process.env.ANDROID_APK_PATH;
    process.env.ANDROID_APK_URL = 'http://downloads.example.com/duoo-capture.apk';
    process.env.ANDROID_APK_PATH = '/tmp/duoo-missing-release.apk';

    try {
        const result = responseRecorder();
        controller.download({}, result.response);
        assert.equal(result.statusCode, 404);
        assert.equal(result.body.error, 'APK ainda não publicado');
    } finally {
        if (previousUrl === undefined) delete process.env.ANDROID_APK_URL;
        else process.env.ANDROID_APK_URL = previousUrl;
        if (previousPath === undefined) delete process.env.ANDROID_APK_PATH;
        else process.env.ANDROID_APK_PATH = previousPath;
    }
});
