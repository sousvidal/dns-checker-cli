import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatJson, formatTable } from "./formatter.js";
import type { DnsResult } from "./types.js";

// Disable chalk colors for predictable test output
vi.mock("chalk", () => {
  const identity = (s: string) => s;
  const chainable: Record<string, unknown> = {};

  const handler: ProxyHandler<typeof identity> = {
    get(_target, prop: string) {
      if (prop === "bold" || prop === "dim" || prop === "cyan" || prop === "white" || prop === "red" || prop === "green" || prop === "yellow") {
        return new Proxy(identity, handler);
      }
      return undefined;
    },
    apply(_target, _thisArg, args: [string]) {
      return args[0];
    },
  };

  return {
    default: new Proxy(identity, handler),
  };
});

describe("formatJson", () => {
  it("returns valid JSON with domain and results", () => {
    const results: DnsResult[] = [
      { type: "A", records: ["1.2.3.4"] },
    ];

    const output = formatJson("example.com", results);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      domain: "example.com",
      results: [{ type: "A", records: ["1.2.3.4"] }],
    });
  });

  it("is pretty-printed with 2-space indent", () => {
    const results: DnsResult[] = [
      { type: "A", records: ["1.2.3.4"] },
    ];

    const output = formatJson("example.com", results);
    const expected = JSON.stringify(
      { domain: "example.com", results },
      null,
      2,
    );

    expect(output).toBe(expected);
  });

  it("includes error fields when present", () => {
    const results: DnsResult[] = [
      { type: "MX", records: [], error: "Timeout" },
    ];

    const output = formatJson("example.com", results);
    const parsed = JSON.parse(output);

    expect(parsed.results[0].error).toBe("Timeout");
  });

  it("handles empty results", () => {
    const output = formatJson("example.com", []);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({ domain: "example.com", results: [] });
  });

  it("handles multiple record types", () => {
    const results: DnsResult[] = [
      { type: "A", records: ["1.2.3.4"] },
      { type: "AAAA", records: ["::1"] },
      { type: "MX", records: ["10 mx.example.com"] },
    ];

    const output = formatJson("example.com", results);
    const parsed = JSON.parse(output);

    expect(parsed.results).toHaveLength(3);
    expect(parsed.results[0].type).toBe("A");
    expect(parsed.results[1].type).toBe("AAAA");
    expect(parsed.results[2].type).toBe("MX");
  });
});

describe("formatTable", () => {
  it("includes the domain in the header", () => {
    const results: DnsResult[] = [
      { type: "A", records: ["1.2.3.4"] },
    ];

    const output = formatTable("example.com", results, false);

    expect(output).toContain("DNS Records for");
    expect(output).toContain("example.com");
  });

  it("shows records with green bullet", () => {
    const results: DnsResult[] = [
      { type: "A", records: ["1.2.3.4"] },
    ];

    const output = formatTable("example.com", results, false);

    expect(output).toContain("● A (IPv4)");
    expect(output).toContain("1.2.3.4");
  });

  it("shows empty records with dim indicator", () => {
    const results: DnsResult[] = [
      { type: "A", records: [] },
    ];

    const output = formatTable("example.com", results, false);

    expect(output).toContain("○ A (IPv4)");
    expect(output).toContain("— no records");
  });

  it("shows error records with red indicator", () => {
    const results: DnsResult[] = [
      { type: "A", records: [], error: "Connection refused" },
    ];

    const output = formatTable("example.com", results, false);

    expect(output).toContain("✖ A (IPv4)");
    expect(output).toContain("Error: Connection refused");
  });

  // ---------- Short mode ----------
  describe("short mode", () => {
    it("skips empty record types in short mode", () => {
      const results: DnsResult[] = [
        { type: "A", records: ["1.2.3.4"] },
        { type: "AAAA", records: [] },
        { type: "MX", records: ["10 mx.example.com"] },
      ];

      const output = formatTable("example.com", results, true);

      expect(output).toContain("● A (IPv4)");
      expect(output).not.toContain("AAAA (IPv6)");
      expect(output).toContain("● MX (Mail Exchange)");
    });

    it("still shows errors in short mode", () => {
      const results: DnsResult[] = [
        { type: "A", records: [], error: "Timeout" },
        { type: "AAAA", records: [] },
      ];

      const output = formatTable("example.com", results, true);

      expect(output).toContain("✖ A (IPv4)");
      expect(output).not.toContain("AAAA (IPv6)");
    });

    it("shows 'No DNS records found' when all are empty in short mode", () => {
      const results: DnsResult[] = [
        { type: "A", records: [] },
        { type: "AAAA", records: [] },
      ];

      const output = formatTable("example.com", results, true);

      expect(output).toContain("No DNS records found.");
    });
  });

  // ---------- Special formatting ----------
  describe("SOA formatting", () => {
    it("renders SOA as a key-value table", () => {
      const results: DnsResult[] = [
        {
          type: "SOA",
          records: [
            "Primary NS: ns1.example.com",
            "Hostmaster: admin.example.com",
            "Serial: 2024010101",
            "Refresh: 3600s",
            "Retry: 900s",
            "Expire: 604800s",
            "Min TTL: 86400s",
          ],
        },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("● SOA (Start of Authority)");
      expect(output).toContain("Primary NS");
      expect(output).toContain("ns1.example.com");
      expect(output).toContain("Hostmaster");
      expect(output).toContain("admin.example.com");
      expect(output).toContain("Serial");
      expect(output).toContain("2024010101");
    });
  });

  describe("MX formatting", () => {
    it("renders MX records with Priority and Exchange headers", () => {
      const results: DnsResult[] = [
        {
          type: "MX",
          records: ["10 mx1.example.com", "20 mx2.example.com"],
        },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("● MX (Mail Exchange)");
      expect(output).toContain("Priority");
      expect(output).toContain("Exchange");
      expect(output).toContain("10");
      expect(output).toContain("mx1.example.com");
      expect(output).toContain("20");
      expect(output).toContain("mx2.example.com");
    });
  });

  describe("CAA formatting", () => {
    it("renders CAA records with Flags, Tag, Value headers", () => {
      const results: DnsResult[] = [
        {
          type: "CAA",
          records: ["0 issue letsencrypt.org"],
        },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("● CAA (Certificate Authority)");
      expect(output).toContain("Flags");
      expect(output).toContain("Tag");
      expect(output).toContain("Value");
      expect(output).toContain("0");
      expect(output).toContain("issue");
      expect(output).toContain("letsencrypt.org");
    });
  });

  describe("SRV formatting", () => {
    it("renders SRV records with Priority, Weight, Port, Target headers", () => {
      const results: DnsResult[] = [
        {
          type: "SRV",
          records: ["10 60 5060 sip.example.com"],
        },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("● SRV (Service)");
      expect(output).toContain("Priority");
      expect(output).toContain("Weight");
      expect(output).toContain("Port");
      expect(output).toContain("Target");
      expect(output).toContain("10");
      expect(output).toContain("60");
      expect(output).toContain("5060");
      expect(output).toContain("sip.example.com");
    });
  });

  // ---------- Default list formatting ----------
  describe("default list formatting", () => {
    it("renders simple list for A records", () => {
      const results: DnsResult[] = [
        { type: "A", records: ["1.2.3.4", "5.6.7.8"] },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("1.2.3.4");
      expect(output).toContain("5.6.7.8");
    });

    it("renders simple list for NS records", () => {
      const results: DnsResult[] = [
        { type: "NS", records: ["ns1.example.com", "ns2.example.com"] },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("ns1.example.com");
      expect(output).toContain("ns2.example.com");
    });

    it("renders simple list for TXT records", () => {
      const results: DnsResult[] = [
        { type: "TXT", records: ["v=spf1 include:_spf.example.com ~all"] },
      ];

      const output = formatTable("example.com", results, false);

      expect(output).toContain("v=spf1 include:_spf.example.com ~all");
    });
  });

  // ---------- Multiple record types ----------
  it("renders all record types in order", () => {
    const results: DnsResult[] = [
      { type: "A", records: ["1.2.3.4"] },
      { type: "AAAA", records: [] },
      { type: "MX", records: ["10 mx.example.com"] },
    ];

    const output = formatTable("example.com", results, false);

    const aPos = output.indexOf("● A (IPv4)");
    const aaaaPos = output.indexOf("○ AAAA (IPv6)");
    const mxPos = output.indexOf("● MX (Mail Exchange)");

    expect(aPos).toBeLessThan(aaaaPos);
    expect(aaaaPos).toBeLessThan(mxPos);
  });
});
