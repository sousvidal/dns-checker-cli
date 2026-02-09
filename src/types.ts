export const RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "NS",
  "TXT",
  "SOA",
  "CAA",
  "SRV",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

export interface DnsResult {
  type: RecordType;
  records: string[];
  error?: string;
}

export interface CliOptions {
  type?: string;
  json?: boolean;
  short?: boolean;
}
