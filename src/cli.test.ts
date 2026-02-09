import { describe, it, expect } from "vitest";
import { RECORD_TYPES, type RecordType } from "./types.js";

/**
 * These tests exercise the CLI validation and parsing logic
 * extracted from src/index.ts without needing to invoke the
 * full CLI (which calls process.exit and program.parse).
 */

// Domain validation regex (same as in index.ts)
const domainRegex =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Record type parsing logic (same as in index.ts)
function parseTypes(typeOption?: string): RecordType[] | { invalid: string[] } {
  if (!typeOption) {
    return [...RECORD_TYPES];
  }

  const requested = typeOption
    .toUpperCase()
    .split(",")
    .map((t) => t.trim());

  const invalid = requested.filter(
    (t) => !RECORD_TYPES.includes(t as RecordType),
  );

  if (invalid.length > 0) {
    return { invalid };
  }

  return requested as RecordType[];
}

describe("domain validation", () => {
  it("accepts valid domains", () => {
    expect(domainRegex.test("example.com")).toBe(true);
    expect(domainRegex.test("sub.example.com")).toBe(true);
    expect(domainRegex.test("deep.sub.example.com")).toBe(true);
    expect(domainRegex.test("example.co.uk")).toBe(true);
    expect(domainRegex.test("my-site.example.com")).toBe(true);
    expect(domainRegex.test("a.io")).toBe(true);
  });

  it("rejects invalid domains", () => {
    expect(domainRegex.test("")).toBe(false);
    expect(domainRegex.test("localhost")).toBe(false);
    expect(domainRegex.test("http://example.com")).toBe(false);
    expect(domainRegex.test("example")).toBe(false);
    expect(domainRegex.test(".example.com")).toBe(false);
    expect(domainRegex.test("example.com.")).toBe(false);
    expect(domainRegex.test("-example.com")).toBe(false);
    expect(domainRegex.test("example-.com")).toBe(false);
    expect(domainRegex.test("exam ple.com")).toBe(false);
    expect(domainRegex.test("1.2.3.4")).toBe(false);
  });
});

describe("record type parsing", () => {
  it("returns all record types when no option is provided", () => {
    const types = parseTypes();

    expect(types).toEqual([...RECORD_TYPES]);
  });

  it("parses a single record type", () => {
    const types = parseTypes("A");

    expect(types).toEqual(["A"]);
  });

  it("parses comma-separated record types", () => {
    const types = parseTypes("A,MX,NS");

    expect(types).toEqual(["A", "MX", "NS"]);
  });

  it("handles whitespace in type list", () => {
    const types = parseTypes("A, MX, NS");

    expect(types).toEqual(["A", "MX", "NS"]);
  });

  it("converts types to uppercase", () => {
    const types = parseTypes("a,mx,ns");

    expect(types).toEqual(["A", "MX", "NS"]);
  });

  it("returns invalid types when unknown types are provided", () => {
    const result = parseTypes("A,INVALID,XYZ");

    expect(result).toEqual({ invalid: ["INVALID", "XYZ"] });
  });

  it("rejects a single invalid type", () => {
    const result = parseTypes("BOGUS");

    expect(result).toEqual({ invalid: ["BOGUS"] });
  });

  it("handles all valid record types", () => {
    const allTypes = RECORD_TYPES.join(",");
    const result = parseTypes(allTypes);

    expect(result).toEqual([...RECORD_TYPES]);
  });
});

describe("RECORD_TYPES constant", () => {
  it("contains all expected DNS record types", () => {
    expect(RECORD_TYPES).toContain("A");
    expect(RECORD_TYPES).toContain("AAAA");
    expect(RECORD_TYPES).toContain("CNAME");
    expect(RECORD_TYPES).toContain("MX");
    expect(RECORD_TYPES).toContain("NS");
    expect(RECORD_TYPES).toContain("TXT");
    expect(RECORD_TYPES).toContain("SOA");
    expect(RECORD_TYPES).toContain("CAA");
    expect(RECORD_TYPES).toContain("SRV");
  });

  it("has exactly 9 record types", () => {
    expect(RECORD_TYPES).toHaveLength(9);
  });
});
