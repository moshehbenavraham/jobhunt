#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  assertSafeUrl,
  installPlaywrightNetworkGuard,
  isPublicIp,
  NetworkPolicyError,
  parseSafeUrl,
  safeFetch,
  safeFetchJson,
} from './network-policy.mjs';

const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }];

for (const address of [
  '0.0.0.0',
  '10.1.2.3',
  '100.64.0.1',
  '127.0.0.1',
  '169.254.169.254',
  '172.31.255.255',
  '192.168.1.1',
  '198.18.0.1',
  '224.0.0.1',
  '::',
  '::1',
  '::ffff:127.0.0.1',
  'fc00::1',
  'fe80::1',
  'ff02::1',
  '2001:db8::1',
  '64:ff9b::a00:1',
]) {
  assert.equal(isPublicIp(address), false, `${address} must be blocked`);
}
for (const address of ['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111']) {
  assert.equal(isPublicIp(address), true, `${address} must be public`);
}

for (const unsafe of [
  'file:///etc/passwd',
  'http://user:pass@example.org/',
  'http://localhost/',
  'http://metadata.google.internal/',
  'http://example.org:8080/',
  'https://example.org:80/',
  'http://2130706433/',
  'http://0177.0.0.1/',
  'http://0x7f000001/',
  'http://[::ffff:127.0.0.1]/',
]) {
  await assert.rejects(
    () => assertSafeUrl(unsafe, { resolver: publicResolver }),
    NetworkPolicyError,
    unsafe,
  );
}

assert.equal(parseSafeUrl('https://EXAMPLE.ORG./jobs').hostname, 'example.org');
await assertSafeUrl('https://jobs.example.org/role', {
  resolver: publicResolver,
});
await assert.rejects(
  () =>
    assertSafeUrl('https://mixed.example.org/', {
      resolver: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ],
    }),
  /Blocked non-public address/,
);

const calls = [];
const redirectResponse = await safeFetch('https://jobs.example.org/start', {
  resolver: publicResolver,
  headers: {
    authorization: 'Bearer secret',
    cookie: 'session=secret',
    'x-public': 'kept',
  },
  requestImpl: async (url, options) => {
    let pinned;
    options.lookup('ignored.invalid', {}, (_error, address, family) => {
      pinned = { address, family };
    });
    calls.push({ url: url.toString(), options, pinned });
    if (calls.length === 1) {
      return {
        statusCode: 302,
        headers: { location: 'https://other.example.org/final' },
        body: Buffer.alloc(0),
      };
    }
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: Buffer.from('{"ok":true}'),
    };
  },
});
assert.equal(redirectResponse.status, 200);
assert.deepEqual(await redirectResponse.json(), { ok: true });
assert.deepEqual(calls[0].pinned, {
  address: '93.184.216.34',
  family: 4,
});
assert.equal(calls[1].options.headers.authorization, undefined);
assert.equal(calls[1].options.headers.cookie, undefined);
assert.equal(calls[1].options.headers['x-public'], 'kept');

await assert.rejects(
  () =>
    safeFetch('https://jobs.example.org/start', {
      resolver: async (hostname) =>
        hostname === 'jobs.example.org'
          ? [{ address: '93.184.216.34', family: 4 }]
          : [{ address: '127.0.0.1', family: 4 }],
      requestImpl: async () => ({
        statusCode: 302,
        headers: { location: 'http://private.example.org/' },
        body: Buffer.alloc(0),
      }),
    }),
  /Blocked non-public address/,
);

let resolverCalls = 0;
await safeFetchJson('https://jobs.example.org/data', {
  resolver: async () => {
    resolverCalls++;
    return [{ address: '93.184.216.34', family: 4 }];
  },
  requestImpl: async (_url, options) => {
    let connectedAddress;
    options.lookup('jobs.example.org', {}, (_error, address) => {
      connectedAddress = address;
    });
    assert.equal(connectedAddress, '93.184.216.34');
    return {
      statusCode: 200,
      headers: {},
      body: Buffer.from('{"pinned":true}'),
    };
  },
});
assert.equal(resolverCalls, 1);

const routeEvents = [];
let routeHandler;
const page = {
  async route(_pattern, handler) {
    routeHandler = handler;
  },
  async unroute() {},
};
const removeGuard = await installPlaywrightNetworkGuard(page, {
  resolver: publicResolver,
});
await routeHandler({
  request: () => ({ url: () => 'https://jobs.example.org/role' }),
  continue: async () => routeEvents.push('continued'),
  abort: async () => routeEvents.push('aborted'),
});
await routeHandler({
  request: () => ({ url: () => 'http://127.0.0.1/admin' }),
  continue: async () => routeEvents.push('continued'),
  abort: async () => routeEvents.push('aborted'),
});
await removeGuard();
assert.deepEqual(routeEvents, ['continued', 'aborted']);

console.log('network policy regression tests pass');
