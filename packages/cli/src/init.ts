import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { templatePath } from "./fs.js";

export interface InitOptions {
  to?: string;
  force?: boolean;
}

export interface InitResult {
  destination: string;
  files: readonly string[];
}

const FILES = ["uikit.config.json", "README.md", join("src", "uikit-starter.tsx")] as const;

/**
 * Copy the console starter into a consumer project.
 *
 * `init` is intentionally small: it adds a sub-30-line CollectionPage starter,
 * a provider/style checklist and a config marker. It does not create a Vite
 * app, install dependencies or choose a router.
 */
export function init(options: InitOptions = {}): InitResult {
  const destination = options.to ?? process.cwd();
  const template = templatePath("console");

  if (!existsSync(template)) {
    throw new Error(`starter template missing: ${template}`);
  }

  cpSync(template, destination, {
    recursive: true,
    force: options.force === true,
    errorOnExist: options.force !== true,
  });

  return { destination, files: FILES };
}
