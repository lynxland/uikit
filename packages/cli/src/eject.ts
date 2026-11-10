import { join } from "node:path";
import { copyDirectory, resolvePackage, writeText } from "./fs.js";

export const EJECTABLE = ["surfaces", "preset-console"] as const;
export type EjectTarget = (typeof EJECTABLE)[number];

const PACKAGE_OF: Record<EjectTarget, string> = {
  surfaces: "@lynxland/uikit-surfaces",
  "preset-console": "@lynxland/uikit-preset-console",
};

export interface EjectOptions {
  to?: string;
  force?: boolean;
}

export interface EjectResult {
  target: EjectTarget;
  packageName: string;
  version: string;
  destination: string;
  files: readonly string[];
}

function isEjectable(value: string): value is EjectTarget {
  return (EJECTABLE as readonly string[]).includes(value);
}

/**
 * Copy a copy-owned package source into the consumer repo.
 *
 * The copied code keeps its `@lynxland/uikit-core` / `@lynxland/uikit-react`
 * imports; only the ejectable package's own source is owned by the consumer.
 * UI adapters are not ejectable (use npm or a custom `ui-*` package).
 */
export function eject(target: string, options: EjectOptions = {}): EjectResult {
  if (!isEjectable(target)) {
    throw new Error(
      `cannot eject "${target}". Ejectable: ${EJECTABLE.join(", ")}. ` +
        "UI adapters (ui-shadcn/ui-plain) stay npm dependencies.",
    );
  }

  const packageName = PACKAGE_OF[target];
  const pkg = resolvePackage(packageName);
  const source = join(pkg.root, "src");
  // `--to` is the exact destination; the default is a stable app-owned path.
  const destination = options.to ?? join(process.cwd(), "src", "uikit", target);

  copyDirectory(source, destination, options.force === true);

  writeText(
    join(destination, "VENDORED.md"),
    [
      `# Vendored ${packageName}`,
      "",
      `- source: \`${packageName}@${pkg.version}\``,
      `- ejected: ${new Date().toISOString().slice(0, 10)}`,
      `- from: \`${source}\``,
      "",
      "This directory is copy-owned. Edit it freely; upgrades are a manual diff",
      "against the installed package source.",
      "",
      "## Import rewrite",
      "",
      `Replace imports from \`${packageName}\` with your local path, for example:`,
      "",
      "```diff",
      `- import { CollectionView } from "${packageName}";`,
      `+ import { CollectionView } from "@/uikit/${target}";`,
      "```",
      "",
      "`@lynxland/uikit-core` / `@lynxland/uikit-react` stay npm dependencies.",
      "",
    ].join("\n"),
    true,
  );

  return {
    target,
    packageName,
    version: pkg.version,
    destination,
    files: ["src", "VENDORED.md"],
  };
}
