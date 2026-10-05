import { Request, Response } from 'express';
import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { createPublicKey, randomBytes } from 'crypto';
import { query } from './db';
import { generateToken, hashPassword } from './auth';

type Provider = 'google' | 'apple';
type Identity = JwtPayload & { sub: string; email?: string; email_verified?: boolean | string; name?: string; nonce?: string };

const keySets = {
  google: 'https://www.googleapis.com/oauth2/v3/certs',
  apple: 'https://appleid.apple.com/auth/keys',
};
const issuers: Record<Provider, [string, ...string[]]> = {
  google: ['accounts.google.com', 'https://accounts.google.com'],
  apple: ['https://appleid.apple.com'],
};

async function verifyIdentityToken(provider: Provider, token: string, nonce?: string): Promise<Identity> {
  const clientIds = provider === 'google'
    ? (process.env.GOOGLE_OAUTH_CLIENT_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean)
    : [process.env.APPLE_BUNDLE_ID ?? 'com.silencexx.silencexx'].filter(Boolean);
  if (clientIds.length === 0) throw new Error(`${provider.toUpperCase()}_CLIENT_ID_NOT_CONFIGURED`);

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) throw new Error('INVALID_ID_TOKEN');
  const keys = await axios.get<{ keys: JsonWebKey[] }>(keySets[provider], { timeout: 8000 });
  const jwk = keys.data.keys.find((key) => key.kid === decoded.header.kid);
  if (!jwk) throw new Error('UNKNOWN_SIGNING_KEY');
  const publicKey = createPublicKey({ key: jwk as import('crypto').JsonWebKey, format: 'jwk' });
  const payload = jwt.verify(token, publicKey, {
    algorithms: provider === 'apple' ? ['RS256'] : ['RS256'],
    audience: clientIds as [string, ...string[]],
    issuer: issuers[provider],
  }) as Identity;
  if (provider === 'apple' && (!nonce || payload.nonce !== nonce)) throw new Error('INVALID_NONCE');
  if (!payload.sub || !payload.email) throw new Error('ID_TOKEN_MISSING_IDENTITY');
  if (payload.email_verified !== true && payload.email_verified !== 'true') throw new Error('EMAIL_NOT_VERIFIED');
  return payload;
}

const providerUnavailable = (provider: Provider, error: unknown) => {
  const message = error instanceof Error ? error.message : '';
  return message.endsWith('_NOT_CONFIGURED') || axios.isAxiosError(error);
};

async function providerAuth(provider: Provider, identityToken: string, displayName: unknown, nonce: string | undefined, res: Response) {
  let identity: Identity;
  try {
    identity = await verifyIdentityToken(provider, identityToken, nonce);
  } catch (error) {
    console.error(`${provider} identity verification failed`, error instanceof Error ? error.message : 'unknown error');
    const unavailable = providerUnavailable(provider, error);
    res.status(unavailable ? 503 : 401).json({
      success: false,
      error: unavailable ? `${provider} sign-in is not configured on this server` : 'Provider identity could not be verified',
    });
    return;
  }

  const email = identity.email!.toLowerCase();
  const providerKey = `${provider}_${identity.sub}`;
  const byProvider = await query(
    `SELECT u.id, u.session_id, ud.email, ud.name
     FROM users u JOIN session s ON s.id = u.session_id
     JOIN user_description ud ON ud.id = u.user_desc_id
     WHERE s.device = $1 LIMIT 1`, [providerKey]);
  let user = byProvider.rows[0];
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const byEmail = await query(
      `SELECT u.id, u.session_id, ud.email, ud.name
       FROM users u JOIN user_description ud ON ud.id = u.user_desc_id
       WHERE LOWER(ud.email) = $1 LIMIT 1`, [email]);
    user = byEmail.rows[0];
    if (user) {
      // Link only the email asserted by the verified provider token.
      await query('UPDATE session SET device = $1 WHERE id = $2', [providerKey, user.session_id]);
    }
  }

  if (!user) {
    const name = typeof identity.name === 'string' ? identity.name
      : typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 64)
      : `${provider} user`;
    const userDesc = await query(
      `INSERT INTO user_description (name, email, registration_date)
       VALUES ($1, $2, NOW()) RETURNING id`, [name, email]);
    const role = await query(
      `INSERT INTO roles (user_role, expiration_date) VALUES ('free', NOW() + INTERVAL '30 days') RETURNING id`, []);
    const sessionKey = await hashPassword(randomBytes(32).toString('hex'));
    const session = await query(
      `INSERT INTO session (ip_adress, session_key, device)
       VALUES ($1, $2, $3) RETURNING id`, ['0.0.0.0', sessionKey, providerKey]);
    const created = await query(
      `INSERT INTO users (user_desc_id, user_role, session_id)
       VALUES ($1, $2, $3) RETURNING id`, [userDesc.rows[0].id, role.rows[0].id, session.rows[0].id]);
    user = { id: created.rows[0].id, session_id: session.rows[0].id, email, name };
    await query(`INSERT INTO settings (id_user, theme, language) VALUES ($1, 0, 1)`, [user.id]);
    await query('INSERT INTO chat_id (user_id) VALUES ($1)', [user.id]);
  }

  const token = generateToken(user.id, user.session_id);
  res.json({ success: true, token, isNewUser, user: { id: user.id, email: user.email, name: user.name, provider } });
}

export const googleAuth = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (typeof idToken !== 'string' || idToken.length > 12_000) {
    return res.status(400).json({ success: false, error: 'A valid Google ID token is required' });
  }
  try { await providerAuth('google', idToken, req.body.displayName, undefined, res); }
  catch (error) {
    console.error('Google account setup failed', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Could not complete Google sign-in' });
  }
};

export const appleAuth = async (req: Request, res: Response) => {
  const { identityToken, nonce, displayName } = req.body;
  if (typeof identityToken !== 'string' || identityToken.length > 12_000 || typeof nonce !== 'string' || nonce.length > 200) {
    return res.status(400).json({ success: false, error: 'A valid Apple identity token is required' });
  }
  try { await providerAuth('apple', identityToken, displayName, nonce, res); }
  catch (error) {
    console.error('Apple account setup failed', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Could not complete Apple sign-in' });
  }
};

type JsonWebKey = { kid?: string; [key: string]: unknown };
