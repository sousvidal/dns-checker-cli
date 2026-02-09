import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RecordType } from "./types.js";

// Mock the entire dns/promises module
vi.mock("node:dns/promises", () => ({
  default: {
    resolve4: vi.fn(),
    resolve6: vi.fn(),
    resolveCname: vi.fn(),
    resolveMx: vi.fn(),
    resolveNs: vi.fn(),
    resolveTxt: vi.fn(),
    resolveSoa: vi.fn(),
    resolveCaa: vi.fn(),
    resolveSrv: vi.fn(),
  },
}));

import dns from "node:dns/promises";
import { resolveDns } from "./dns.js";

const mockedDns = vi.mocked(dns);

describe("resolveDns", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---------- A records ----------
  describe("A records", () => {
    it("resolves IPv4 addresses", async () => {
      mockedDns.resolve4.mockResolvedValue(["93.184.216.34", "93.184.216.35"]);

      const results = await resolveDns("example.com", ["A"]);

      expect(results).toEqual([
        { type: "A", records: ["93.184.216.34", "93.184.216.35"] },
      ]);
      expect(mockedDns.resolve4).toHaveBeenCalledWith("example.com");
    });

    it("returns empty records for ENODATA", async () => {
      const error = new Error("queryA ENODATA example.com") as NodeJS.ErrnoException;
      error.code = "ENODATA";
      mockedDns.resolve4.mockRejectedValue(error);

      const results = await resolveDns("example.com", ["A"]);

      expect(results).toEqual([{ type: "A", records: [] }]);
    });

    it("returns empty records for ENOTFOUND", async () => {
      const error = new Error("queryA ENOTFOUND example.com") as NodeJS.ErrnoException;
      error.code = "ENOTFOUND";
      mockedDns.resolve4.mockRejectedValue(error);

      const results = await resolveDns("example.com", ["A"]);

      expect(results).toEqual([{ type: "A", records: [] }]);
    });

    it("returns error message for unexpected errors", async () => {
      mockedDns.resolve4.mockRejectedValue(new Error("DNS server timeout"));

      const results = await resolveDns("example.com", ["A"]);

      expect(results).toEqual([
        { type: "A", records: [], error: "DNS server timeout" },
      ]);
    });
  });

  // ---------- AAAA records ----------
  describe("AAAA records", () => {
    it("resolves IPv6 addresses", async () => {
      mockedDns.resolve6.mockResolvedValue(["2606:2800:220:1:248:1893:25c8:1946"]);

      const results = await resolveDns("example.com", ["AAAA"]);

      expect(results).toEqual([
        { type: "AAAA", records: ["2606:2800:220:1:248:1893:25c8:1946"] },
      ]);
    });
  });

  // ---------- CNAME records ----------
  describe("CNAME records", () => {
    it("resolves canonical names", async () => {
      mockedDns.resolveCname.mockResolvedValue(["www.example.com"]);

      const results = await resolveDns("alias.example.com", ["CNAME"]);

      expect(results).toEqual([
        { type: "CNAME", records: ["www.example.com"] },
      ]);
    });
  });

  // ---------- MX records ----------
  describe("MX records", () => {
    it("resolves and sorts MX records by priority", async () => {
      mockedDns.resolveMx.mockResolvedValue([
        { priority: 20, exchange: "mx2.example.com" },
        { priority: 10, exchange: "mx1.example.com" },
        { priority: 30, exchange: "mx3.example.com" },
      ]);

      const results = await resolveDns("example.com", ["MX"]);

      expect(results).toEqual([
        {
          type: "MX",
          records: [
            "10 mx1.example.com",
            "20 mx2.example.com",
            "30 mx3.example.com",
          ],
        },
      ]);
    });

    it("handles null MX (domain does not accept mail)", async () => {
      mockedDns.resolveMx.mockResolvedValue([{ priority: 0, exchange: "." }]);

      const results = await resolveDns("example.com", ["MX"]);

      expect(results).toEqual([
        {
          type: "MX",
          records: ["0 . (null MX — domain does not accept mail)"],
        },
      ]);
    });
  });

  // ---------- NS records ----------
  describe("NS records", () => {
    it("resolves name servers", async () => {
      mockedDns.resolveNs.mockResolvedValue(["ns1.example.com", "ns2.example.com"]);

      const results = await resolveDns("example.com", ["NS"]);

      expect(results).toEqual([
        { type: "NS", records: ["ns1.example.com", "ns2.example.com"] },
      ]);
    });
  });

  // ---------- TXT records ----------
  describe("TXT records", () => {
    it("resolves and joins TXT record chunks", async () => {
      mockedDns.resolveTxt.mockResolvedValue([
        ["v=spf1 include:_spf.example.com", " ~all"],
        ["google-site-verification=abc123"],
      ]);

      const results = await resolveDns("example.com", ["TXT"]);

      expect(results).toEqual([
        {
          type: "TXT",
          records: [
            "v=spf1 include:_spf.example.com ~all",
            "google-site-verification=abc123",
          ],
        },
      ]);
    });
  });

  // ---------- SOA records ----------
  describe("SOA records", () => {
    it("resolves and formats SOA record", async () => {
      mockedDns.resolveSoa.mockResolvedValue({
        nsname: "ns1.example.com",
        hostmaster: "admin.example.com",
        serial: 2024010101,
        refresh: 3600,
        retry: 900,
        expire: 604800,
        minttl: 86400,
      });

      const results = await resolveDns("example.com", ["SOA"]);

      expect(results).toEqual([
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
      ]);
    });
  });

  // ---------- CAA records ----------
  describe("CAA records", () => {
    it("resolves CAA issue records", async () => {
      mockedDns.resolveCaa.mockResolvedValue([
        { critical: 0, issue: "letsencrypt.org" },
      ]);

      const results = await resolveDns("example.com", ["CAA"]);

      expect(results).toEqual([
        { type: "CAA", records: ["0 issue letsencrypt.org"] },
      ]);
    });

    it("resolves CAA issuewild records", async () => {
      mockedDns.resolveCaa.mockResolvedValue([
        { critical: 0, issuewild: "letsencrypt.org" },
      ]);

      const results = await resolveDns("example.com", ["CAA"]);

      expect(results).toEqual([
        { type: "CAA", records: ["0 issuewild letsencrypt.org"] },
      ]);
    });

    it("resolves CAA iodef records", async () => {
      mockedDns.resolveCaa.mockResolvedValue([
        { critical: 0, iodef: "mailto:admin@example.com" },
      ]);

      const results = await resolveDns("example.com", ["CAA"]);

      expect(results).toEqual([
        { type: "CAA", records: ["0 iodef mailto:admin@example.com"] },
      ]);
    });

    it("handles critical flag", async () => {
      mockedDns.resolveCaa.mockResolvedValue([
        { critical: 128, issue: "letsencrypt.org" },
      ]);

      const results = await resolveDns("example.com", ["CAA"]);

      expect(results).toEqual([
        { type: "CAA", records: ["128 issue letsencrypt.org"] },
      ]);
    });
  });

  // ---------- SRV records ----------
  describe("SRV records", () => {
    it("resolves SRV records", async () => {
      mockedDns.resolveSrv.mockResolvedValue([
        { priority: 10, weight: 60, port: 5060, name: "sip.example.com" },
        { priority: 20, weight: 10, port: 5060, name: "sip2.example.com" },
      ]);

      const results = await resolveDns("_sip._tcp.example.com", ["SRV"]);

      expect(results).toEqual([
        {
          type: "SRV",
          records: [
            "10 60 5060 sip.example.com",
            "20 10 5060 sip2.example.com",
          ],
        },
      ]);
    });
  });

  // ---------- Parallel resolution ----------
  describe("parallel resolution", () => {
    it("resolves multiple record types in parallel", async () => {
      mockedDns.resolve4.mockResolvedValue(["1.2.3.4"]);
      mockedDns.resolveMx.mockResolvedValue([
        { priority: 10, exchange: "mx.example.com" },
      ]);
      mockedDns.resolveNs.mockResolvedValue(["ns1.example.com"]);

      const results = await resolveDns("example.com", ["A", "MX", "NS"]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ type: "A", records: ["1.2.3.4"] });
      expect(results[1]).toEqual({
        type: "MX",
        records: ["10 mx.example.com"],
      });
      expect(results[2]).toEqual({
        type: "NS",
        records: ["ns1.example.com"],
      });
    });

    it("handles mixed success and failure results", async () => {
      mockedDns.resolve4.mockResolvedValue(["1.2.3.4"]);

      const error = new Error("queryAAAA ENODATA") as NodeJS.ErrnoException;
      error.code = "ENODATA";
      mockedDns.resolve6.mockRejectedValue(error);

      mockedDns.resolveMx.mockRejectedValue(new Error("Connection refused"));

      const results = await resolveDns("example.com", ["A", "AAAA", "MX"]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ type: "A", records: ["1.2.3.4"] });
      expect(results[1]).toEqual({ type: "AAAA", records: [] });
      expect(results[2]).toEqual({
        type: "MX",
        records: [],
        error: "Connection refused",
      });
    });

    it("returns results in the same order as requested types", async () => {
      // Make later types resolve faster to verify order is preserved
      mockedDns.resolveNs.mockResolvedValue(["ns1.example.com"]);
      mockedDns.resolve4.mockResolvedValue(["1.2.3.4"]);
      mockedDns.resolveTxt.mockResolvedValue([["v=spf1"]]);

      const results = await resolveDns("example.com", ["NS", "A", "TXT"]);

      expect(results[0].type).toBe("NS");
      expect(results[1].type).toBe("A");
      expect(results[2].type).toBe("TXT");
    });
  });

  // ---------- Edge cases ----------
  describe("edge cases", () => {
    it("handles empty types array", async () => {
      const results = await resolveDns("example.com", []);

      expect(results).toEqual([]);
    });

    it("uses fallback error message when error has no message", async () => {
      mockedDns.resolve4.mockRejectedValue(new Error(""));

      const results = await resolveDns("example.com", ["A"]);

      expect(results).toEqual([
        { type: "A", records: [], error: "Failed to resolve A records" },
      ]);
    });
  });
});
