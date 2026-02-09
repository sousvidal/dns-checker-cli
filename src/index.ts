import { createRequire } from "node:module";
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { resolveDns } from "./dns.js";
import { formatJson, formatTable } from "./formatter.js";
import { RECORD_TYPES, type CliOptions, type RecordType } from "./types.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("dns-checker")
  .description("Check DNS records for a domain")
  .version(version)
  .argument("<domain>", "Domain name to check (e.g. example.com)")
  .option(
    "-t, --type <types>",
    "Comma-separated record types to query (e.g. A,MX,TXT)",
  )
  .option("-j, --json", "Output results as JSON")
  .option("-s, --short", "Compact output (skip empty record types)")
  .action(async (domain: string, options: CliOptions) => {
    // Validate domain
    const domainRegex =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      console.error(chalk.red(`\nInvalid domain: ${domain}`));
      console.error(
        chalk.dim(
          "Expected a domain like example.com or sub.example.co.uk\n",
        ),
      );
      process.exit(1);
    }

    // Parse and validate requested record types
    let types: RecordType[];

    if (options.type) {
      const requested = options.type
        .toUpperCase()
        .split(",")
        .map((t) => t.trim());

      const invalid = requested.filter(
        (t) => !RECORD_TYPES.includes(t as RecordType),
      );

      if (invalid.length > 0) {
        console.error(
          chalk.red(`\nUnknown record type(s): ${invalid.join(", ")}`),
        );
        console.error(
          chalk.dim(`Valid types: ${RECORD_TYPES.join(", ")}\n`),
        );
        process.exit(1);
      }

      types = requested as RecordType[];
    } else {
      types = [...RECORD_TYPES];
    }

    // Resolve DNS records with a spinner (only when outputting to a TTY)
    const isInteractive = !options.json && process.stdout.isTTY;
    const spinner = ora({
      text: `Resolving DNS records for ${chalk.bold(domain)}...`,
      color: "cyan",
      isSilent: !isInteractive,
    });
    spinner.start();

    try {
      const results = await resolveDns(domain, types);
      spinner.stop();

      if (options.json) {
        console.log(formatJson(domain, results));
      } else {
        console.log(formatTable(domain, results, options.short ?? false));
      }
    } catch (err) {
      spinner.fail(
        chalk.red(`Failed to resolve DNS for ${domain}`),
      );
      const error = err as Error;
      console.error(chalk.red.dim(`  ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
