import { describe, it, expect } from "vitest";
import {
  emailSchema,
  emailArraySchema,
  validateEmail,
  validateEmails,
} from "../../../src/validation/email.validator.js";

describe("emailSchema", () => {
  it("accepts a valid email address", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("accepts emails with subdomains", () => {
    expect(emailSchema.safeParse("user@mail.example.co.uk").success).toBe(true);
  });

  it("accepts emails with plus sign", () => {
    expect(emailSchema.safeParse("user+tag@example.com").success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects a string without @", () => {
    expect(emailSchema.safeParse("notanemail").success).toBe(false);
  });

  it("rejects a string without domain", () => {
    expect(emailSchema.safeParse("user@").success).toBe(false);
  });

  it("rejects a string without TLD", () => {
    expect(emailSchema.safeParse("user@example").success).toBe(false);
  });

  it("rejects an email exceeding 254 characters", () => {
    const longEmail = "a".repeat(245) + "@example.com";
    expect(emailSchema.safeParse(longEmail).success).toBe(false);
  });
});

describe("emailArraySchema", () => {
  it("accepts an array of valid emails", () => {
    const result = emailArraySchema.safeParse(["a@example.com", "b@example.com"]);
    expect(result.success).toBe(true);
  });

  it("accepts an empty array", () => {
    expect(emailArraySchema.safeParse([]).success).toBe(true);
  });

  it("rejects an array containing an invalid email", () => {
    const result = emailArraySchema.safeParse(["valid@example.com", "notvalid"]);
    expect(result.success).toBe(false);
  });

  it("rejects arrays with more than 50 addresses", () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `user${i}@example.com`);
    expect(emailArraySchema.safeParse(tooMany).success).toBe(false);
  });
});

describe("validateEmail helper", () => {
  it("returns { valid: true } for a valid email", () => {
    expect(validateEmail("hello@world.com")).toEqual({ valid: true });
  });

  it("returns { valid: false, error } for an invalid email", () => {
    const result = validateEmail("bad-email");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("not a valid email");
    }
  });
});

describe("validateEmails helper", () => {
  it("returns { valid: true } for an array of valid emails", () => {
    expect(validateEmails(["a@b.com", "c@d.com"])).toEqual({ valid: true });
  });

  it("returns { valid: false, error } if any email is invalid", () => {
    const result = validateEmails(["valid@example.com", "bad"]);
    expect(result.valid).toBe(false);
  });
});
