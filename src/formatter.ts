import chalk from "chalk";
import Table from "cli-table3";
import type { DnsResult } from "./types.js";

const TYPE_LABELS: Record<string, string> = {
  A: "A (IPv4)",
  AAAA: "AAAA (IPv6)",
  CNAME: "CNAME (Canonical Name)",
  MX: "MX (Mail Exchange)",
  NS: "NS (Name Servers)",
  TXT: "TXT (Text)",
  SOA: "SOA (Start of Authority)",
  CAA: "CAA (Certificate Authority)",
  SRV: "SRV (Service)",
};

/**
 * Format DNS results as a JSON string.
 */
export function formatJson(domain: string, results: DnsResult[]): string {
  return JSON.stringify({ domain, results }, null, 2);
}

/**
 * Format DNS results as a colorful CLI table output.
 */
export function formatTable(
  domain: string,
  results: DnsResult[],
  short: boolean,
): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    chalk.bold.cyan("  DNS Records for ") + chalk.bold.white(domain),
  );
  lines.push(chalk.dim("  " + "─".repeat(50)));
  lines.push("");

  let hasAnyRecords = false;

  for (const result of results) {
    // In short mode, skip record types with no records and no errors
    if (short && result.records.length === 0 && !result.error) {
      continue;
    }

    const label = TYPE_LABELS[result.type] ?? result.type;

    if (result.error) {
      lines.push(chalk.red(`  ✖ ${label}`));
      lines.push(chalk.red.dim(`    Error: ${result.error}`));
      lines.push("");
      hasAnyRecords = true;
      continue;
    }

    if (result.records.length === 0) {
      lines.push(chalk.dim(`  ○ ${label}`) + chalk.dim("  — no records"));
      lines.push("");
      continue;
    }

    hasAnyRecords = true;
    lines.push(chalk.green(`  ● ${label}`));

    if (result.type === "SOA") {
      // SOA gets a special key-value table
      const table = new Table({
        style: { "padding-left": 4, "padding-right": 2, head: [], border: [] },
        chars: tableChars(),
      });

      for (const record of result.records) {
        const [key, ...valueParts] = record.split(": ");
        table.push([chalk.dim(key), chalk.white(valueParts.join(": "))]);
      }
      lines.push(table.toString());
    } else if (result.type === "MX") {
      // MX shows priority + exchange in a table
      const table = new Table({
        head: [chalk.dim("Priority"), chalk.dim("Exchange")],
        style: { "padding-left": 4, "padding-right": 2, head: [], border: [] },
        chars: tableChars(),
      });

      for (const record of result.records) {
        const [priority, ...rest] = record.split(" ");
        table.push([chalk.yellow(priority), chalk.white(rest.join(" "))]);
      }
      lines.push(table.toString());
    } else if (result.type === "CAA") {
      // CAA shows flags, tag, value
      const table = new Table({
        head: [chalk.dim("Flags"), chalk.dim("Tag"), chalk.dim("Value")],
        style: { "padding-left": 4, "padding-right": 2, head: [], border: [] },
        chars: tableChars(),
      });

      for (const record of result.records) {
        const [flags, tag, ...rest] = record.split(" ");
        table.push([
          chalk.yellow(flags),
          chalk.cyan(tag),
          chalk.white(rest.join(" ")),
        ]);
      }
      lines.push(table.toString());
    } else if (result.type === "SRV") {
      // SRV shows priority, weight, port, target
      const table = new Table({
        head: [
          chalk.dim("Priority"),
          chalk.dim("Weight"),
          chalk.dim("Port"),
          chalk.dim("Target"),
        ],
        style: { "padding-left": 4, "padding-right": 2, head: [], border: [] },
        chars: tableChars(),
      });

      for (const record of result.records) {
        const [priority, weight, port, target] = record.split(" ");
        table.push([
          chalk.yellow(priority),
          chalk.white(weight),
          chalk.cyan(port),
          chalk.white(target),
        ]);
      }
      lines.push(table.toString());
    } else {
      // Default: simple list of values
      const table = new Table({
        style: { "padding-left": 4, "padding-right": 2, head: [], border: [] },
        chars: tableChars(),
      });

      for (const record of result.records) {
        table.push([chalk.white(record)]);
      }
      lines.push(table.toString());
    }

    lines.push("");
  }

  if (!hasAnyRecords && short) {
    lines.push(chalk.dim("  No DNS records found."));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Minimal table border characters for a clean look.
 */
function tableChars(): Table.TableConstructorOptions["chars"] {
  return {
    top: "",
    "top-mid": "",
    "top-left": "",
    "top-right": "",
    bottom: "",
    "bottom-mid": "",
    "bottom-left": "",
    "bottom-right": "",
    left: "    ",
    "left-mid": "",
    mid: "",
    "mid-mid": "",
    right: "",
    "right-mid": "",
    middle: "  ",
  };
}
