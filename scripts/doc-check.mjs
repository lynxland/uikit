#!/usr/bin/env node
/**
 * doc-check —— 防止文档漂移的最小机械门（design.md §7.3）。
 *
 * 检查的是“事实性锚点”，不是文风：
 *   - README/README_ZH/llms 的版本与 packages/core/package.json 一致；
 *   - design.md 有版本/日期/状态行；
 *   - SKILL.md 有当前版本边界 + 指向 design.md；
 *   - 归档/审计/设计三件存在；
 *   - 已废弃的矛盾规则不再回到 SKILL/AGENTS。
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), "utf8");
const failures = [];

const pkg = JSON.parse(read("packages/core/package.json"));
const version = pkg.version;

const requiredFiles = [
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/design.md",
  "docs/philosophy.md",
  "docs/design-history.md",
  "docs/SKILL.md",
  "docs/audits/2026-11-07-conceptual-audit.md",
  "docs/audits/2026-11-08-design-review.md",
  "docs/audits/2026-11-08-dokploy-dogfood.md",
  "docs/adr/0001-two-axis-architecture.md",
  "docs/migrations/v3-execution-plan.md",
  "docs/llms.txt",
];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) failures.push(`缺少文件：${file}`);
}

const design = read("docs/design.md");
for (const line of ["- **版本**：v3.0", "- **日期**：2026-11-07", "- **状态**："]) {
  if (!design.includes(line)) failures.push(`docs/design.md 缺少规范头：${line}`);
}
if (!design.includes("不保留向后兼容")) {
  failures.push("docs/design.md 未声明“不保留向后兼容”的 cutover 立场");
}
for (const term of ["preset", "UI adapter", "surfaces", "Page Template", "Composition", "开箱即用"]) {
  if (!design.toLowerCase().includes(term.toLowerCase())) {
    failures.push(`docs/design.md 缺少产品分层概念：${term}`);
  }
}

const philosophy = read("docs/philosophy.md");
for (const term of ["preset", "UI adapter", "surfaces", "Page Template", "Composition", "开箱即用"]) {
  if (!philosophy.toLowerCase().includes(term.toLowerCase())) {
    failures.push(`docs/philosophy.md 缺少产品分层概念：${term}`);
  }
}

const skill = read("docs/SKILL.md");
if (!skill.includes(version)) {
  failures.push(`docs/SKILL.md 未声明当前版本 ${version}`);
}
if (!skill.includes("docs/design.md")) {
  failures.push("docs/SKILL.md 未指向 docs/design.md");
}

for (const [file, label] of [
  ["README.md", "README.md"],
  ["README_ZH.md", "README_ZH.md"],
  ["docs/llms.txt", "docs/llms.txt"],
]) {
  if (!read(file).includes(version)) {
    failures.push(`${label} 未出现当前版本 ${version}`);
  }
}

const forbidden = [
  ["docs/SKILL.md", "Page 与 CRUD 页块互斥不嵌套"],
  ["docs/SKILL.md", "双壳（Page 套 TablePage/ListPage）是反模式"],
  ["AGENTS.md", "名词预算 = 4"],
];
for (const [file, phrase] of forbidden) {
  if (read(file).includes(phrase)) {
    failures.push(`${file} 出现已废弃/矛盾的规则：${phrase}`);
  }
}

if (failures.length > 0) {
  console.error(`doc-check: ${failures.length} 处文档漂移`);
  for (const failure of failures) console.error(`  ✖ ${failure}`);
  process.exit(1);
}
console.log(`doc-check: 全部通过（版本 ${version} / design v3 / SKILL 边界 / 归档在位）`);
