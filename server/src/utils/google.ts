import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
}

let client: OAuth2Client | null = null;

const getClient = (): OAuth2Client => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  if (!client) client = new OAuth2Client(clientId);
  return client;
};

export async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleProfile> {
  const info = await getClient().getTokenInfo(accessToken);

  if (info.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch');
  }
  if (!info.sub || !info.email) {
    throw new Error('Google token is missing profile fields');
  }

  return {
    googleId: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified ?? false,
  };
}
