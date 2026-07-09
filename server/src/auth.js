const { verifyToken } = require('@clerk/backend');

function bearerToken(request) {
  const header = request.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

async function requireAuth(request) {
  const token = bearerToken(request);
  if (!token) {
    throw Object.assign(new Error('Sign in is required.'), { statusCode: 401, publicMessage: 'Sign in is required.' });
  }

  if (!process.env.CLERK_SECRET_KEY && !process.env.CLERK_JWT_KEY) {
    throw Object.assign(new Error('Clerk is not configured.'), { statusCode: 500 });
  }

  try {
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties: process.env.CLERK_AUTHORIZED_PARTIES
        ? process.env.CLERK_AUTHORIZED_PARTIES.split(',').map((origin) => origin.trim()).filter(Boolean)
        : undefined,
    });

    return {
      userId: claims.sub,
      sessionId: claims.sid,
      email: claims.email || claims.email_address || claims.primary_email_address || null,
    };
  } catch (error) {
    console.error('Clerk token verification failed:', error);
    throw Object.assign(new Error('Sign in is required.'), { statusCode: 401, publicMessage: 'Sign in is required.' });
  }
}

module.exports = { requireAuth };
