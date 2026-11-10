import { doctor } from "./doctor.js";
import { EJECTABLE, eject } from "./eject.js";
import { init } from "./init.js";

const HELP = `@lynxland/uikit-cli

Usage:
  uikit init [--to <dir>] [--force]
  uikit eject <${EJECTABLE.join("|")}> [--to <dir>] [--force]
  uikit doctor
  uikit list

Commands:
  init    copy the console starter (CollectionPage + provider/CSS checklist)
  eject   copy surfaces/preset-console source into your repo (copy-owned)
  doctor  check runtime packages, UI adapter and stylesheet wiring
  list    list ejectable packages

UI adapters (ui-shadcn/ui-plain) are npm dependencies; they are not ejectable.
`;

interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Map<string, string | true>;
}

function parse(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === undefined) continue;
    if (value.startsWith("--")) {
      const name = value.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags.set(name, next);
        index += 1;
      } else {
        flags.set(name, true);
      }
      continue;
    }
    positionals.push(value);
  }
  return { command: positionals.shift(), positionals, flags };
}

function flagString(flags: Map<string, string | true>, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function printDoctor(): boolean {
  const result = doctor();
  for (const note of result.notes) console.log(`note: ${note}`);
  for (const warning of result.warnings) console.warn(`warn: ${warning}`);
  for (const error of result.errors) console.error(`error: ${error}`);
  if (result.ok) console.log("doctor: ok");
  return result.ok;
}

export async function main(argv: string[]): Promise<void> {
  const { command, positionals, flags } = parse(argv);

  if (command === undefined || command === "help" || flags.has("help")) {
    console.log(HELP);
    return;
  }

  switch (command) {
    case "list": {
      console.log(`ejectable: ${EJECTABLE.join(", ")}`);
      console.log("npm-only: @lynxland/uikit-ui-shadcn, @lynxland/uikit-ui-plain");
      return;
    }
    case "init": {
      const result = init({
        ...(flagString(flags, "to") !== undefined ? { to: flagString(flags, "to")! } : {}),
        force: flags.has("force"),
      });
      console.log(`init: wrote ${result.files.join(", ")} to ${result.destination}`);
      console.log("next: install @lynxland/uikit + TanStack peers, mount PresetProvider, import preset.css");
      return;
    }
    case "eject": {
      const target = positionals[0];
      if (target === undefined) {
        throw new Error(`eject needs a target: ${EJECTABLE.join(" | ")}`);
      }
      const result = eject(target, {
        ...(flagString(flags, "to") !== undefined ? { to: flagString(flags, "to")! } : {}),
        force: flags.has("force"),
      });
      console.log(
        `eject: ${result.packageName}@${result.version} -> ${result.destination} ` +
          `(${result.files.join(", ")})`,
      );
      console.log("next: replace package imports with your local path; see VENDORED.md");
      return;
    }
    case "doctor": {
      if (!printDoctor()) process.exitCode = 1;
      return;
    }
    default:
      throw new Error(`unknown command "${command}". Run "uikit help".`);
  }
}
