import { randomBytes, createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.JOBHUNT_ROOT
  ? resolve(process.env.JOBHUNT_ROOT)
  : resolve(SCRIPT_DIR, '..', '..', '..');

export const OPENAI_CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
export const OPENAI_CODEX_AUTHORIZE_URL =
  'https://auth.openai.com/oauth/authorize';
export const OPENAI_CODEX_TOKEN_URL = 'https://auth.openai.com/oauth/token';
export const OPENAI_CODEX_REDIRECT_URI = 'http://localhost:1455/auth/callback';
export const OPENAI_CODEX_SCOPE = 'openid profile email offline_access';
export const OPENAI_CODEX_PROVIDER = 'openai-codex';
export const OPENAI_CODEX_JWT_CLAIM_PATH = 'https://api.openai.com/auth';
export const OPENAI_CODEX_AUTH_PATH_ENV = 'JOBHUNT_OPENAI_ACCOUNT_AUTH_PATH';
export const OPENAI_CODEX_CALLBACK_HOST_ENV =
  'JOBHUNT_OPENAI_OAUTH_CALLBACK_HOST';
export const OPENAI_CODEX_DEFAULT_AUTH_PATH = join(
  ROOT,
  'data',
  'openai-account-auth.json',
);

export function getDefaultAuthPath() {
  return process.env[OPENAI_CODEX_AUTH_PATH_ENV]
    ? resolve(process.env[OPENAI_CODEX_AUTH_PATH_ENV])
    : OPENAI_CODEX_DEFAULT_AUTH_PATH;
}

export function getDefaultCallbackHost() {
  return process.env[OPENAI_CODEX_CALLBACK_HOST_ENV] || '127.0.0.1';
}

export function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4 || 4)) % 4;
  return Buffer.from(`${normalized}${'='.repeat(paddingLength)}`, 'base64');
}

export function generatePkcePair() {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function createState() {
  return randomBytes(16).toString('hex');
}

export function parseAuthorizationInput(input) {
  const value = String(input || '').trim();
  if (!value) {
    return {};
  }

  try {
    const url = new URL(value);
    return {
      code: url.searchParams.get('code') || undefined,
      state: url.searchParams.get('state') || undefined,
    };
  } catch {
    // Continue with non-URL parsing paths.
  }

  if (value.includes('#')) {
    const [code, state] = value.split('#', 2);
    return { code: code || undefined, state: state || undefined };
  }

  if (value.includes('code=')) {
    const params = new URLSearchParams(value);
    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
    };
  }

  return { code: value };
}

export function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) {
      return null;
    }
    return JSON.parse(fromBase64Url(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
}

export function extractChatGptAccountId(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const authClaims = payload?.[OPENAI_CODEX_JWT_CLAIM_PATH];
  const accountId = authClaims?.chatgpt_account_id;
  return typeof accountId === 'string' && accountId.length > 0
    ? accountId
    : null;
}

export function createSuccessHtml(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authentication successful</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Arial, sans-serif;
      background: #0b1020;
      color: #f8fafc;
      text-align: center;
    }
    main {
      max-width: 520px;
    }
    p {
      color: #cbd5e1;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main>
    <h1>Authentication successful</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

export function createErrorHtml(message) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authentication failed</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Arial, sans-serif;
      background: #1f0a12;
      color: #f8fafc;
      text-align: center;
    }
    main {
      max-width: 520px;
    }
    p {
      color: #fecdd3;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main>
    <h1>Authentication failed</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
