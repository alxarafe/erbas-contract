import test from 'node:test';
import assert from 'node:assert/strict';
import { runBruno, conformanceScopes } from '../../scripts/conformance.mjs';
import { startFixture, fixtureEnv } from '../fixtures/core.mjs';
const authFailures = [
  ["token containing trailing newline", { "200": { "body": "{\"accessToken\":\"bad\\n\"}" } }],
  [
    "success rejected",
    {
      "200": {
        "status": 401
      }
    }
  ],
  [
    "empty token",
    {
      "200": {
        "body": "{\"accessToken\":\"\"}"
      }
    }
  ],
  [
    "missing token",
    {
      "200": {
        "body": "{}"
      }
    }
  ],
  [
    "numeric token",
    {
      "200": {
        "body": "{\"accessToken\":42}"
      }
    }
  ],
  [
    "array response",
    {
      "200": {
        "body": "[]"
      }
    }
  ],
  [
    "malformed login JSON",
    {
      "200": {
        "body": "{"
      }
    }
  ],
  [
    "additional token fields",
    {
      "200": {
        "body": "{\"accessToken\":\"synthetic\",\"refreshToken\":\"synthetic\"}"
      }
    }
  ],
  [
    "token containing whitespace",
    {
      "200": {
        "body": "{\"accessToken\":\"bad token\"}"
      }
    }
  ],
  [
    "wrong login content type",
    {
      "200": {
        "contentType": "application/problem+json"
      }
    }
  ],
  [
    "malformed login media parameter",
    {
      "200": {
        "contentType": "application/json; charset="
      }
    }
  ],
  [
    "missing no-store",
    {
      "200": {
        "headers": {
          "Cache-Control": "public"
        }
      }
    }
  ],
  [
    "incorrect credentials accepted",
    {
      "401": {
        "status": 200
      }
    }
  ],
  [
    "credential error exposes account",
    {
      "401": {
        "body": "{\"code\":\"unknown_user\",\"errors\":[{\"code\":\"unknown_user\"}]}"
      }
    }
  ],
  [
    "missing challenge",
    {
      "401": {
        "headers": {
          "WWW-Authenticate": "Basic"
        }
      }
    }
  ],
  [
    "invalid payload unauthorized",
    {
      "400": {
        "status": 401
      }
    }
  ],
  [
    "invalid payload accepted",
    {
      "400": {
        "status": 200
      }
    }
  ],
  [
    "incorrect invalid request body",
    {
      "400": {
        "body": "{\"code\":\"invalid_credentials\",\"errors\":[{\"code\":\"invalid_credentials\"}]}"
      }
    }
  ],
  [
    "redirect login",
    {
      "200": {
        "status": 302,
        "headers": {
          "Location": "/health"
        }
      }
    }
  ],
  [
    "login HTTP timeout",
    {
      "200": {
        "hang": true
      }
    }
  ]
];
for (const [name, auth] of authFailures) {
  test(name, { timeout: 15000 }, async () => {
    const fixture = await startFixture({ auth });
    try {
      const result = await runBruno(fixture.baseUrl, { env: fixtureEnv, scope: conformanceScopes.auth });
      assert.notEqual(result.code, 0, result.output);
      assert.notEqual(result.code, 124);
      assert.ok(fixture.faultsReached.includes(Object.keys(auth)[0]), 'fault must reach the targeted AUTH response');
      assert.ok(fixture.requests.every(request => request.path === '/api/auth/login'), 'AUTH scope must exclude other groups');
      assert.ok(!result.output.includes(fixtureEnv.ERBAS_TEST_PASSWORD));
      assert.ok(!result.output.includes('synthetic.token_123'));
    } finally { await fixture.close(); }
  });
}
