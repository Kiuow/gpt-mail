import test from "node:test";
import assert from "node:assert/strict";
import {
  CredentialFormatError,
  parseCredentialLine,
  parseCredentialText,
} from "../src/credentials.js";

const CLIENT_ID = "11111111-2222-3333-4444-555555555555";
const TOKEN = "refresh-token-value-that-is-long-enough";

test("parses four-part credential format", () => {
  const result = parseCredentialLine(
    `user@outlook.com----secret----${CLIENT_ID}----${TOKEN}`,
  );
  assert.equal(result.email, "user@outlook.com");
  assert.equal(result.password, "secret");
  assert.equal(result.clientId, CLIENT_ID);
  assert.equal(result.refreshToken, TOKEN);
});

test("parses client ID and token joined by a pipe", () => {
  const result = parseCredentialLine(
    `user@outlook.com----secret----${CLIENT_ID}|${TOKEN}`,
  );
  assert.equal(result.clientId, CLIENT_ID);
  assert.equal(result.refreshToken, TOKEN);
});

test("uses fallback client ID for three-part format", () => {
  const result = parseCredentialLine(
    `user@outlook.com----secret----${TOKEN}`,
    CLIENT_ID,
  );
  assert.equal(result.clientId, CLIENT_ID);
});

test("rejects too many accounts", () => {
  const text = [
    `one@outlook.com----secret----${CLIENT_ID}----${TOKEN}`,
    `two@outlook.com----secret----${CLIENT_ID}----${TOKEN}`,
  ].join("\n");
  assert.throws(
    () => parseCredentialText(text, "", 1),
    CredentialFormatError,
  );
});

