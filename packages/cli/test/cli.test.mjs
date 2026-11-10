import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, "..", "bin", "uikit.mjs");

function run(args, options = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    ...options,
  });
}

test("list exposes ejectable packages and npm-only adapters", () => {
  const result = run(["list"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ejectable: surfaces, preset-console/);
  assert.match(result.stdout, /ui-shadcn/);
});

test("eject surfaces copies source + VENDORED.md", () => {
  const tmp = mkdtempSync(join(tmpdir(), "uikit-cli-eject-"));
  try {
    const out = join(tmp, "owned");
    const result = run(["eject", "surfaces", "--to", out]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(out, "adapter.ts")));
    assert.ok(existsSync(join(out, "VENDORED.md")));
    assert.match(readFileSync(join(out, "VENDORED.md"), "utf8"), /@lynxland\/uikit-surfaces/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("eject refuses unknown targets and existing destinations", () => {
  const tmp = mkdtempSync(join(tmpdir(), "uikit-cli-guard-"));
  try {
    const unknown = run(["eject", "ui-shadcn", "--to", join(tmp, "x")]);
    assert.notEqual(unknown.status, 0);
    assert.match(unknown.stderr, /cannot eject/);

    const out = join(tmp, "owned");
    writeFileSync(out, "occupied");
    const existing = run(["eject", "surfaces", "--to", out]);
    assert.notEqual(existing.status, 0);
    assert.match(existing.stderr, /target already exists/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("init writes the starter files", () => {
  const tmp = mkdtempSync(join(tmpdir(), "uikit-cli-init-"));
  try {
    const result = run(["init", "--to", tmp]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(tmp, "uikit.config.json")));
    assert.ok(existsSync(join(tmp, "src", "uikit-starter.tsx")));
    assert.match(readFileSync(join(tmp, "src", "uikit-starter.tsx"), "utf8"), /CollectionPage/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("doctor reports missing runtime packages and passes a wired project", () => {
  const tmp = mkdtempSync(join(tmpdir(), "uikit-cli-doctor-"));
  try {
    writeFileSync(join(tmp, "package.json"), JSON.stringify({ name: "consumer", dependencies: {} }));
    const bad = run(["doctor"], { cwd: tmp });
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /missing dependency/);

    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({
        name: "consumer",
        dependencies: {
          "@lynxland/uikit-core": "*",
          "@lynxland/uikit-react": "*",
          "@lynxland/uikit-surfaces": "*",
          "@lynxland/uikit-ui-shadcn": "*",
        },
      }),
    );
    mkdirSync(join(tmp, "src"), { recursive: true });
    writeFileSync(
      join(tmp, "src", "styles.css"),
      '@import "tailwindcss";\n@import "@lynxland/uikit/preset.css";\n' +
        '@source "../node_modules/@lynxland/uikit-ui-shadcn/src";\n',
    );
    const good = run(["doctor"], { cwd: tmp });
    assert.equal(good.status, 0, good.stderr);
    assert.match(good.stdout, /doctor: ok/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
