import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readJson } from "./fs.js";

export interface DoctorResult {
  ok: boolean;
  errors: readonly string[];
  warnings: readonly string[];
  notes: readonly string[];
}

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const STYLE_CANDIDATES = [
  "src/styles.css",
  "src/index.css",
  "src/app.css",
  "app/globals.css",
  "styles/globals.css",
];

function hasDependency(pkg: PackageJson, name: string): boolean {
  return Boolean(
    pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? pkg.peerDependencies?.[name],
  );
}

function styleFiles(cwd: string): string[] {
  return STYLE_CANDIDATES.map((path) => join(cwd, path)).filter((path) => existsSync(path));
}

/**
 * Check the consumer wiring that cannot be verified by TypeScript alone:
 * runtime packages, a UI adapter, and the two CSS surfaces.
 */
export function doctor(cwd: string = process.cwd()): DoctorResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  const packagePath = join(cwd, "package.json");
  if (!existsSync(packagePath)) {
    return {
      ok: false,
      errors: [`no package.json in ${cwd}`],
      warnings: [],
      notes: [],
    };
  }

  const pkg = readJson<PackageJson>(packagePath);

  for (const name of [
    "@lynxland/uikit-core",
    "@lynxland/uikit-react",
    "@lynxland/uikit-surfaces",
  ]) {
    if (!hasDependency(pkg, name)) {
      errors.push(`missing dependency: ${name}`);
    }
  }

  const hasMeta = hasDependency(pkg, "@lynxland/uikit");
  const uiAdapters = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) =>
    name.startsWith("@lynxland/uikit-ui-"),
  );
  if (!hasMeta && uiAdapters.length === 0) {
    warnings.push(
      "no UI adapter found: install @lynxland/uikit-ui-shadcn (or ui-plain), " +
        "or mount UiAdapterProvider with your own adapter.",
    );
  } else if (uiAdapters.length > 0) {
    notes.push(`UI adapter: ${uiAdapters.join(", ")}`);
  }

  const styles = styleFiles(cwd);
  if (styles.length === 0) {
    warnings.push(
      "no stylesheet found (src/styles.css / app/globals.css); import " +
        "@lynxland/uikit/preset.css (or surfaces.css + tokens.css) once at the app root.",
    );
  } else {
    const css = styles.map((path) => readFileSync(path, "utf8")).join("\n");
    const hasSurfaceCss =
      css.includes("@lynxland/uikit/preset.css") ||
      css.includes("@lynxland/uikit-surfaces/surfaces.css");
    if (!hasSurfaceCss) {
      warnings.push(
        "stylesheet does not import @lynxland/uikit/preset.css " +
          "(or @lynxland/uikit-surfaces/surfaces.css).",
      );
    }
    const usesTailwind = css.includes('@import "tailwindcss"') || css.includes("@import 'tailwindcss'");
    if (usesTailwind) {
      const sources = css.includes("packages/ui-shadcn") || css.includes("ui-shadcn/src");
      if (!sources) {
        warnings.push(
          "Tailwind does not scan the UI adapter source; add " +
            '@source "../../../node_modules/@lynxland/uikit-ui-shadcn/src" ' +
            "(adjust the relative path) or the equivalent content glob.",
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    notes,
  };
}
