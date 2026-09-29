const { OAuth2Client } = require('google-auth-library');

const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

function getGoogleConfig() {
    return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
    };
}

function isGoogleConfigured() {
    const { clientId, clientSecret } = getGoogleConfig();
    return Boolean(clientId && clientSecret);
}

function createGoogleClient() {
    const { clientId, clientSecret, redirectUri } = getGoogleConfig();
    return new OAuth2Client(clientId, clientSecret, redirectUri);
}

function createAuthorizationUrl(state) {
    const client = createGoogleClient();
    return client.generateAuthUrl({
        access_type: 'online',
        scope: GOOGLE_SCOPES,
        state,
        prompt: 'select_account'
    });
}

async function verifyAuthorizationCode(code) {
    const client = createGoogleClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new Error('Google não retornou um token de identidade');

    const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: getGoogleConfig().clientId
    });
    return ticket.getPayload();
}

module.exports = { createAuthorizationUrl, isGoogleConfigured, verifyAuthorizationCode };
