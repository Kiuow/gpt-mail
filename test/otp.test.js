import test from "node:test";
import assert from "node:assert/strict";
import { extractOtp } from "../src/otp.js";

test("extracts a Chinese verification code", () => {
  assert.equal(extractOtp("登录验证码", "您的验证码是 482913，请勿泄露"), "482913");
});

test("extracts an English verification code", () => {
  assert.equal(extractOtp("Security alert", "Your verification code: A7K29Q"), "A7K29Q");
});

test("does not treat a year as a fallback OTP", () => {
  assert.equal(extractOtp("Monthly report", "Published in 2026"), "");
});

