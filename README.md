# dns-checker-cli

A fast, zero-config CLI tool for looking up DNS records of any domain. Queries all common record types in parallel and displays the results in a readable, color-coded table -- or as JSON for scripting.

## Install

```bash
npm install -g dns-checker-cli
```

Or run it directly without installing:

```bash
npx dns-checker-cli example.com
```

## Usage

```
dns-checker <domain> [options]
```

### Options

| Flag | Description |
| --- | --- |
| `-t, --type <types>` | Comma-separated record types to query (e.g. `A,MX,TXT`) |
| `-j, --json` | Output results as JSON |
| `-s, --short` | Compact output — skip record types with no results |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

### Examples

Look up all DNS records for a domain:

```bash
dns-checker example.com
```

Query only specific record types:

```bash
dns-checker example.com --type A,MX,NS
```

Get JSON output (useful for piping into `jq` or other tools):

```bash
dns-checker example.com --json
```

Skip empty record types for a cleaner overview:

```bash
dns-checker example.com --short
```

Combine flags:

```bash
dns-checker example.com -t A,AAAA,MX -s
```

## Supported Record Types

| Type | Description |
| --- | --- |
| `A` | IPv4 addresses |
| `AAAA` | IPv6 addresses |
| `CNAME` | Canonical name (alias) |
| `MX` | Mail exchange servers (sorted by priority) |
| `NS` | Name servers |
| `TXT` | Text records (SPF, DKIM, domain verification, etc.) |
| `SOA` | Start of authority |
| `CAA` | Certificate authority authorization |
| `SRV` | Service locator records |

By default, all types are queried. Use `--type` to limit the query to specific types.

## JSON Output

When using `--json`, the output structure is:

```json
{
  "domain": "example.com",
  "results": [
    {
      "type": "A",
      "records": ["93.184.216.34"]
    },
    {
      "type": "MX",
      "records": ["10 mail.example.com"]
    }
  ]
}
```

Records that failed to resolve will include an `error` field:

```json
{
  "type": "SRV",
  "records": [],
  "error": "querySrv ENODATA example.com"
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- example.com

# Build for distribution
npm run build

# Lint
npm run lint
```

### Project Structure

```
src/
├── index.ts       # CLI entry point (argument parsing, orchestration)
├── dns.ts         # DNS resolution logic (parallel queries via node:dns)
├── formatter.ts   # Output formatting (table and JSON)
└── types.ts       # Shared type definitions
```

## Requirements

- Node.js >= 18

## License

MIT
