import { lookup as dnsLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; jobhunt/1.5)';
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
]);
const BLOCKED_HOST_SUFFIXES = [
  '.example',
  '.home',
  '.internal',
  '.invalid',
  '.lan',
  '.local',
  '.localdomain',
  '.localhost',
  '.test',
];

export class NetworkPolicyError extends Error {
  constructor(message, code = 'ERR_NETWORK_POLICY') {
    super(message);
    this.name = 'NetworkPolicyError';
    this.code = code;
  }
}

function stripIpv6Brackets(value) {
  const text = String(value || '').trim();
  return text.startsWith('[') && text.endsWith(']') ? text.slice(1, -1) : text;
}

function ipv4Number(address) {
  if (isIP(address) !== 4) return null;
  return address
    .split('.')
    .reduce((value, octet) => value * 256 + Number(octet), 0);
}

function ipv4InCidr(value, base, prefix) {
  const addressNumber = ipv4Number(value);
  const baseNumber = ipv4Number(base);
  if (addressNumber === null || baseNumber === null) return false;
  const shift = 32 - prefix;
  return (
    Math.floor(addressNumber / 2 ** shift) ===
    Math.floor(baseNumber / 2 ** shift)
  );
}

const BLOCKED_IPV4_CIDRS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function parseIpv6Words(address) {
  let value = stripIpv6Brackets(address).toLowerCase();
  const zoneIndex = value.indexOf('%');
  if (zoneIndex !== -1) value = value.slice(0, zoneIndex);
  if (isIP(value) !== 6) return null;

  const dottedMatch = value.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dottedMatch) {
    const embedded = ipv4Number(dottedMatch[1]);
    if (embedded === null) return null;
    value = value.replace(
      dottedMatch[1],
      `${((embedded >>> 16) & 0xffff).toString(16)}:${(
        embedded & 0xffff
      ).toString(16)}`,
    );
  }

  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const zeroCount = halves.length === 2 ? 8 - left.length - right.length : 0;
  const parts = [...left, ...Array(zeroCount).fill('0'), ...right];
  if (parts.length !== 8) return null;
  const words = parts.map((part) => Number.parseInt(part || '0', 16));
  return words.every(
    (word) => Number.isInteger(word) && word >= 0 && word <= 0xffff,
  )
    ? words
    : null;
}

function embeddedIpv4(words, offset = 6) {
  return `${words[offset] >>> 8}.${words[offset] & 0xff}.${
    words[offset + 1] >>> 8
  }.${words[offset + 1] & 0xff}`;
}

export function isPublicIp(address) {
  const value = stripIpv6Brackets(address);
  const family = isIP(value);
  if (family === 4) {
    return !BLOCKED_IPV4_CIDRS.some(([base, prefix]) =>
      ipv4InCidr(value, base, prefix),
    );
  }
  if (family !== 6) return false;

  const words = parseIpv6Words(value);
  if (!words) return false;

  const allZeroExceptLast = words.slice(0, 7).every((word) => word === 0);
  if (allZeroExceptLast) return false;

  const isMapped =
    words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const isCompatible = words.slice(0, 6).every((word) => word === 0);
  if (isMapped || isCompatible) {
    return isPublicIp(embeddedIpv4(words));
  }

  const first = words[0];
  if ((first & 0xfe00) === 0xfc00) return false;
  if ((first & 0xffc0) === 0xfe80) return false;
  if ((first & 0xff00) === 0xff00) return false;
  if (first === 0x2001 && words[1] === 0x0db8) return false;
  if (first === 0x2001 && words[1] === 0x0000) return false;
  if (first === 0x2001 && words[1] === 0x0002) return false;
  if (first === 0x0100 && words.slice(1, 4).every((word) => word === 0)) {
    return false;
  }

  const isNat64 =
    first === 0x0064 &&
    (words[1] === 0xff9b || words[1] === 0xff9b + 1) &&
    words.slice(2, 6).every((word) => word === 0);
  if (isNat64 && !isPublicIp(embeddedIpv4(words))) return false;

  return (first & 0xe000) === 0x2000 || isNat64;
}

function normalizeHostname(hostname) {
  const unwrapped = stripIpv6Brackets(hostname).replace(/\.+$/, '');
  if (!unwrapped) {
    throw new NetworkPolicyError('URL hostname is empty', 'ERR_UNSAFE_HOST');
  }
  if (isIP(unwrapped)) return unwrapped.toLowerCase();

  const ascii = domainToASCII(unwrapped).toLowerCase();
  if (
    !ascii ||
    ascii.length > 253 ||
    ascii.split('.').some((label) => !label || label.length > 63)
  ) {
    throw new NetworkPolicyError(
      `Invalid URL hostname: ${hostname}`,
      'ERR_UNSAFE_HOST',
    );
  }
  return ascii;
}

export function parseSafeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new NetworkPolicyError(`Invalid URL: ${input}`, 'ERR_INVALID_URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new NetworkPolicyError(
      `Blocked URL protocol: ${url.protocol}`,
      'ERR_UNSAFE_PROTOCOL',
    );
  }
  if (url.username || url.password) {
    throw new NetworkPolicyError(
      'URL credentials are not allowed',
      'ERR_URL_CREDENTIALS',
    );
  }

  const hostname = normalizeHostname(url.hostname);
  const family = isIP(hostname);
  if (
    !family &&
    (!hostname.includes('.') ||
      BLOCKED_HOST_SUFFIXES.some(
        (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
      ))
  ) {
    throw new NetworkPolicyError(
      `Blocked non-public hostname: ${hostname}`,
      'ERR_UNSAFE_HOST',
    );
  }

  const expectedPort = url.protocol === 'https:' ? '443' : '80';
  if (url.port && url.port !== expectedPort) {
    throw new NetworkPolicyError(
      `Blocked URL port: ${url.port}`,
      'ERR_UNSAFE_PORT',
    );
  }

  url.hostname = hostname;
  return url;
}

async function defaultResolver(hostname) {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

function normalizeResolvedAddresses(result) {
  const entries = Array.isArray(result) ? result : [result];
  return entries
    .map((entry) =>
      typeof entry === 'string'
        ? { address: entry, family: isIP(entry) }
        : { address: entry?.address, family: Number(entry?.family) },
    )
    .filter(
      (entry) =>
        typeof entry.address === 'string' && [4, 6].includes(entry.family),
    );
}

export async function assertSafeUrl(
  input,
  { resolver = defaultResolver } = {},
) {
  const url = parseSafeUrl(input);
  const hostname = normalizeHostname(url.hostname);
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : normalizeResolvedAddresses(await resolver(hostname));

  if (addresses.length === 0) {
    throw new NetworkPolicyError(
      `Hostname did not resolve: ${hostname}`,
      'ERR_DNS_EMPTY',
    );
  }
  const unsafe = addresses.find(({ address }) => !isPublicIp(address));
  if (unsafe) {
    throw new NetworkPolicyError(
      `Blocked non-public address for ${hostname}: ${unsafe.address}`,
      'ERR_UNSAFE_ADDRESS',
    );
  }

  return { url, hostname, addresses };
}

function pinnedLookup(address, family) {
  return (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, [{ address, family }]);
      return;
    }
    callback(null, address, family);
  };
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  const source =
    headers instanceof Headers ? headers.entries() : Object.entries(headers);
  for (const [name, value] of source) {
    if (value !== undefined && value !== null) {
      normalized[String(name).toLowerCase()] = String(value);
    }
  }
  delete normalized.host;
  delete normalized.connection;
  if (!normalized['user-agent']) normalized['user-agent'] = DEFAULT_USER_AGENT;
  return normalized;
}

function defaultRequest(url, options) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, options, (response) => {
      const chunks = [];
      let received = 0;
      response.on('data', (chunk) => {
        received += chunk.length;
        if (received > options.maxBytes) {
          request.destroy(
            new NetworkPolicyError(
              `Response exceeds ${options.maxBytes} bytes`,
              'ERR_RESPONSE_TOO_LARGE',
            ),
          );
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          statusMessage: response.statusMessage || '',
          headers: response.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    request.setTimeout(options.timeoutMs, () => {
      request.destroy(
        new NetworkPolicyError(
          `Request timed out after ${options.timeoutMs}ms`,
          'ERR_NETWORK_TIMEOUT',
        ),
      );
    });
    request.on('error', reject);
    if (options.body !== undefined && options.body !== null) {
      request.write(options.body);
    }
    request.end();
  });
}

function responseHeader(headers, name) {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === wanted) {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return null;
}

class SafeResponse {
  constructor({ url, statusCode, statusMessage, headers, body }) {
    this.url = url;
    this.status = statusCode;
    this.statusText = statusMessage || '';
    this.headers = new Headers();
    for (const [name, rawValue] of Object.entries(headers || {})) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) {
        if (value !== undefined) this.headers.append(name, String(value));
      }
    }
    this.bodyBytes = Buffer.from(body || '');
    this.ok = statusCode >= 200 && statusCode < 300;
  }

  async text() {
    return this.bodyBytes.toString('utf8');
  }

  async json() {
    return JSON.parse(await this.text());
  }

  async arrayBuffer() {
    return this.bodyBytes.buffer.slice(
      this.bodyBytes.byteOffset,
      this.bodyBytes.byteOffset + this.bodyBytes.byteLength,
    );
  }
}

export async function safeFetch(
  input,
  {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    redirect = 'follow',
    resolver = defaultResolver,
    requestImpl = defaultRequest,
  } = {},
) {
  let currentUrl = parseSafeUrl(input);
  let currentMethod = String(method).toUpperCase();
  let currentBody = body;
  let currentHeaders = normalizeHeaders(headers);

  for (let hop = 0; ; hop++) {
    const vetted = await assertSafeUrl(currentUrl, { resolver });
    const selected = vetted.addresses[hop % vetted.addresses.length];
    const response = await requestImpl(vetted.url, {
      method: currentMethod,
      headers: currentHeaders,
      body: currentBody,
      timeoutMs,
      maxBytes,
      lookup: pinnedLookup(selected.address, selected.family),
      servername: vetted.hostname,
    });

    const statusCode = Number(response.statusCode || response.status || 0);
    const location = responseHeader(response.headers, 'location');
    if (!REDIRECT_STATUSES.has(statusCode) || !location) {
      return new SafeResponse({
        url: vetted.url.toString(),
        statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        body: response.body,
      });
    }
    if (redirect === 'error') {
      throw new NetworkPolicyError(
        `Redirect blocked for ${vetted.url}`,
        'ERR_REDIRECT_BLOCKED',
      );
    }
    if (redirect === 'manual') {
      return new SafeResponse({
        url: vetted.url.toString(),
        statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        body: response.body,
      });
    }
    if (hop >= maxRedirects) {
      throw new NetworkPolicyError(
        `Too many redirects for ${input}`,
        'ERR_TOO_MANY_REDIRECTS',
      );
    }

    const nextUrl = parseSafeUrl(new URL(location, vetted.url));
    if (nextUrl.origin !== vetted.url.origin) {
      currentHeaders = Object.fromEntries(
        Object.entries(currentHeaders).filter(
          ([name]) => !SENSITIVE_HEADERS.has(name),
        ),
      );
    }
    if (
      statusCode === 303 ||
      ((statusCode === 301 || statusCode === 302) && currentMethod === 'POST')
    ) {
      currentMethod = 'GET';
      currentBody = undefined;
      delete currentHeaders['content-length'];
      delete currentHeaders['content-type'];
    }
    currentUrl = nextUrl;
  }
}

export async function safeFetchJson(input, options = {}) {
  const response = await safeFetch(input, options);
  if (!response.ok) {
    const error = new Error(
      `HTTP ${response.status} ${response.statusText}`.trim(),
    );
    error.status = response.status;
    error.body = await response.text();
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }
  return response.json();
}

export async function safeFetchText(input, options = {}) {
  const response = await safeFetch(input, options);
  if (!response.ok) {
    const error = new Error(
      `HTTP ${response.status} ${response.statusText}`.trim(),
    );
    error.status = response.status;
    error.body = await response.text();
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }
  return response.text();
}

export async function installPlaywrightNetworkGuard(
  page,
  { resolver = defaultResolver } = {},
) {
  if (!page || typeof page.route !== 'function') return async () => {};

  const handler = async (route) => {
    try {
      await assertSafeUrl(route.request().url(), { resolver });
      await route.continue();
    } catch {
      await route.abort('blockedbyclient');
    }
  };
  await page.route('**/*', handler);
  return async () => {
    if (typeof page.unroute === 'function') {
      await page.unroute('**/*', handler);
    }
  };
}

export {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
};
