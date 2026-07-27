import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMicrosoftImapUser } from "../src/mailbox.js";

test("removes plus tags from Outlook consumer IMAP usernames", () => {
  assert.equal(
    normalizeMicrosoftImapUser("Example+inbox@outlook.com"),
    "Example@outlook.com",
  );
  assert.equal(
    normalizeMicrosoftImapUser("Example+inbox@HOTMAIL.COM"),
    "Example@hotmail.com",
  );
});

test("keeps non-Microsoft and ordinary addresses unchanged", () => {
  assert.equal(
    normalizeMicrosoftImapUser("example+inbox@example.com"),
    "example+inbox@example.com",
  );
  assert.equal(
    normalizeMicrosoftImapUser("example@outlook.com"),
    "example@outlook.com",
  );
});
