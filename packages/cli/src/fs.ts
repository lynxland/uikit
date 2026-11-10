import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);

export interface PackageInfo {
  root: string;
  name: string;
  version: string;
}

/** Walk up from a package entry until the matching package.json is found. */
export function resolvePackage(spec: string): PackageInfo {
  const entry = require.resolve(spec);
  let dir = dirname(entry);
  while (dir !== dirname(dir)) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      const data = JSON.parse(readFileSync(candidate, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (data.name === spec) {
        return { root: dir, name: spec, version: data.version ?? "0.0.0" };
      }
    }
    dir = dirname(dir);
  }
  throw new Error(`could not resolve package root for ${spec}`);
}

export function copyDirectory(source: string, destination: string, force: boolean): void {
  if (existsSync(destination)) {
    if (!force) {
      throw new Error(
        `target already exists: ${destination}\n` +
          "copy-owned code is edited by hand; pass --force only when you intend to replace it.",
      );
    }
    rmSync(destination, { recursive: true, force: true });
  }
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

export function writeText(path: string, contents: string, force: boolean): void {
  if (existsSync(path) && !force) {
    throw new Error(`file already exists: ${path} (pass --force to overwrite)`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function cwdPath(value: string | undefined, fallback: string): string {
  return resolve(value ?? process.cwd(), fallback);
}

export function templatePath(name: string): string {
  return new URL(`../templates/${name}`, import.meta.url).pathname;
}
