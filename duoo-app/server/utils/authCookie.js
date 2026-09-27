const COOKIE_NAME = 'duoo_access_token';

const options = {
    httpOnly: true,
    // The frontend and API are deployed on different origins in production
    // (for example Pages/Vercel + Render), so the auth cookie must be usable
    // in a cross-site request. Secure is required by browsers for SameSite=None.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
};

function setAuthCookie(res, token) {
    res.cookie(COOKIE_NAME, token, options);
}

function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, { ...options, maxAge: undefined });
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };
