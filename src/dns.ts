import dns from "node:dns/promises";
import type { DnsResult, RecordType } from "./types.js";

/**
 * Resolve a single DNS record type for a domain.
 * Returns a DnsResult with formatted string records, or an error message.
 */
async function resolveType(
  domain: string,
  type: RecordType,
): Promise<DnsResult> {
  try {
    switch (type) {
      case "A": {
        const records = await dns.resolve4(domain);
        return { type, records };
      }
      case "AAAA": {
        const records = await dns.resolve6(domain);
        return { type, records };
      }
      case "CNAME": {
        const records = await dns.resolveCname(domain);
        return { type, records };
      }
      case "MX": {
        const records = await dns.resolveMx(domain);
        return {
          type,
          records: records
            .sort((a, b) => a.priority - b.priority)
            .map((r) => {
              if (r.priority === 0 && r.exchange === ".") {
                return `${r.priority} . (null MX — domain does not accept mail)`;
              }
              return `${r.priority} ${r.exchange}`;
            }),
        };
      }
      case "NS": {
        const records = await dns.resolveNs(domain);
        return { type, records };
      }
      case "TXT": {
        const records = await dns.resolveTxt(domain);
        return { type, records: records.map((r) => r.join("")) };
      }
      case "SOA": {
        const record = await dns.resolveSoa(domain);
        return {
          type,
          records: [
            `Primary NS: ${record.nsname}`,
            `Hostmaster: ${record.hostmaster}`,
            `Serial: ${record.serial}`,
            `Refresh: ${record.refresh}s`,
            `Retry: ${record.retry}s`,
            `Expire: ${record.expire}s`,
            `Min TTL: ${record.minttl}s`,
          ],
        };
      }
      case "CAA": {
        const records = await dns.resolveCaa(domain);
        return {
          type,
          records: records.map((r) => {
            const flags = r.critical ? "128" : "0";
            const tag =
              r.issue != null
                ? "issue"
                : r.issuewild != null
                  ? "issuewild"
                  : "iodef";
            const value = r.issue ?? r.issuewild ?? r.iodef ?? "unknown";
            return `${flags} ${tag} ${value}`;
          }),
        };
      }
      case "SRV": {
        const records = await dns.resolveSrv(domain);
        return {
          type,
          records: records.map(
            (r) => `${r.priority} ${r.weight} ${r.port} ${r.name}`,
          ),
        };
      }
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;

    // NODATA means the record type simply doesn't exist for this domain
    if (error.code === "ENODATA" || error.code === "ENOTFOUND") {
      return { type, records: [] };
    }

    return {
      type,
      records: [],
      error: error.message || `Failed to resolve ${type} records`,
    };
  }
}

/**
 * Resolve all requested DNS record types for a domain in parallel.
 */
export async function resolveDns(
  domain: string,
  types: RecordType[],
): Promise<DnsResult[]> {
  const results = await Promise.allSettled(
    types.map((type) => resolveType(domain, type)),
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      type: types[index],
      records: [],
      error: result.reason?.message ?? "Unknown error",
    };
  });
}
