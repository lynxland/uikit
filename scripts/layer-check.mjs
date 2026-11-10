#!/usr/bin/env node
/**
 * layer-check —— 分层不变量的机械检查（design.md §2.1 / §7.1）。
 *
 * v3 规则：
 *   kernel    只许相对导入（零依赖、零 react、零 effect）
 *   schema    允许相对 + kernel；禁止 effect
 *   adapters  允许相对 + kernel；禁止 effect
 *   react     允许相对 + react + @tanstack + core；禁止 effect；
 *             @tanstack/react-router 只许出现在 src/router/**
 *   testing   允许相对 + react 系 + @tanstack 系 + @lynxland 包 + @testing-library
 *   surfaces  允许相对 + react 系 + tanstack query/table/form + core/react/surfaces；
 *             禁止 Router、effect、具体 UI 库
 *   surfaces-controls / surfaces-views（目录缺失时跳过）
 *             控件零数据/零 Router；视图不画壳
 *   ui-shadcn 允许相对 + react 系 + base-ui + surfaces + clsx/cva/merge/lucide；
 *             禁止 effect、react 绑定、Router/query
 *   ui-plain  允许相对 + react 系 + surfaces；禁止 effect、react 绑定、Router/query
 *   preset-console 允许相对 + react 系 + @tanstack 系 + core/react/surfaces；
 *             禁止具体 UI 库、effect
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const violations = [];

// 同时捕获 `from "x"` / `import("x")` / 副作用 `import "x"`（纯样式/注册入口也受分层约束）。
const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

const isReactRuntime = (spec) =>
  spec === "react" ||
  spec.startsWith("react/") ||
  spec === "react-dom" ||
  spec.startsWith("react-dom/");

const isCoreSpec = (spec) =>
  spec === "@lynxland/uikit-core" || spec.startsWith("@lynxland/uikit-core/");

const isCoreKernelSpec = (spec) =>
  spec === "@lynxland/uikit-core/kernel" || spec.startsWith("@lynxland/uikit-core/kernel/");

const isRouterSpec = (spec) => /^@tanstack\/(react-router|router-core)(\/|$)/.test(spec);

const isUiKitSpec = (spec) => spec === "@lynxland/uikit" || spec.startsWith("@lynxland/uikit-");

const isReactPackageSpec = (spec) =>
  spec === "@lynxland/uikit-react" || spec.startsWith("@lynxland/uikit-react/");

const isSurfacesSpec = (spec) =>
  spec === "@lynxland/uikit-surfaces" || spec.startsWith("@lynxland/uikit-surfaces/");

const isPresetSpec = (spec) =>
  spec === "@lynxland/uikit-preset-console" ||
  spec.startsWith("@lynxland/uikit-preset-console/");

const isTanStackPresentationSpec = (spec) =>
  /^@tanstack\/(react-query|react-table|react-form)(\/|$)/.test(spec);

const isTanStackReactTableSpec = (spec) => /^@tanstack\/react-table(\/|$)/.test(spec);

const isTanStackReactFormSpec = (spec) => /^@tanstack\/react-form(\/|$)/.test(spec);

// 具体 UI 库/样式工具只许住 ui-shadcn 或消费方；surfaces/preset 只依赖 contract。
const isConcreteUiSpec = (spec) =>
  spec.startsWith("@base-ui/") ||
  spec.startsWith("@radix-ui/") ||
  spec.startsWith("tailwind-") ||
  spec === "tailwindcss" ||
  spec.startsWith("tailwindcss/") ||
  spec === "clsx" ||
  spec.startsWith("clsx/") ||
  spec === "class-variance-authority" ||
  spec.startsWith("class-variance-authority/") ||
  spec === "lucide-react" ||
  spec.startsWith("lucide-react/");

const toPosix = (file) => relative(root, file).split(sep).join("/");

const LAYER_RULES = {
  kernel: {
    base: "packages/core/src/kernel",
    allowed: (spec, isRelative) => isRelative, // 只允许相对导入
    label: "kernel（零依赖、零 react、零 effect）",
  },
  schema: {
    base: "packages/core/src/schema",
    allowed: (spec, isRelative) => isRelative || isCoreKernelSpec(spec),
    banned: ["effect"],
    label: "schema（相对 + kernel；禁 effect）",
  },
  adapters: {
    base: "packages/core/src/adapters",
    allowed: (spec, isRelative) => isRelative || isCoreKernelSpec(spec),
    banned: ["effect"],
    label: "adapters（相对 + kernel；禁 effect）",
  },
  react: {
    base: "packages/react/src",
    allowed: (spec, isRelative) =>
      isRelative || isReactRuntime(spec) || spec.startsWith("@tanstack/") || isCoreSpec(spec),
    banned: ["effect"],
    forbid: (spec, file) => {
      if (!isRouterSpec(spec)) return null;
      if (toPosix(file).startsWith("packages/react/src/router/")) return null;
      return `禁止在 /router 之外导入 "${spec}"（URL 绑定只许住 packages/react/src/router/**）`;
    },
    label: "react（相对 + react/tanstack/core；禁 effect；Router 仅 /router）",
  },
  testing: {
    base: "packages/testing/src",
    allowed: (spec, isRelative) =>
      isRelative ||
      isReactRuntime(spec) ||
      spec.startsWith("@tanstack/") ||
      isUiKitSpec(spec) ||
      spec === "@testing-library/react" ||
      spec.startsWith("@testing-library/react/"),
    banned: ["effect"],
    label: "testing（相对 + react/tanstack/lynxland/testing-library；禁 effect）",
  },
  surfaces: {
    base: "packages/surfaces/src",
    allowed: (spec, isRelative) =>
      isRelative ||
      isReactRuntime(spec) ||
      isTanStackPresentationSpec(spec) ||
      isCoreSpec(spec) ||
      isReactPackageSpec(spec) ||
      isSurfacesSpec(spec),
    banned: ["effect", "@tanstack/react-router"],
    forbid: (spec) => {
      if (isConcreteUiSpec(spec)) {
        return `禁止 surfaces 导入具体 UI 库 "${spec}"（只依赖 UiAdapter contract）`;
      }
      if (
        spec === "@lynxland/uikit-react/router" ||
        spec.startsWith("@lynxland/uikit-react/router/")
      ) {
        return `禁止 surfaces 导入 "${spec}"（URL 绑定只许住应用/preset 层）`;
      }
      return null;
    },
    label: "surfaces（相对 + react/tanstack/core/react/surfaces；禁 Router/effect/具体 UI 库）",
  },
  "surfaces-controls": {
    base: "packages/surfaces/src/controls",
    allowed: (spec, isRelative) =>
      isRelative ||
      isReactRuntime(spec) ||
      isCoreSpec(spec) ||
      isUiKitSpec(spec) ||
      isTanStackReactTableSpec(spec) ||
      isTanStackReactFormSpec(spec),
    banned: ["effect", "@lynxland/uikit-react", "@tanstack/react-query", "@tanstack/react-router"],
    label: "surfaces controls（受控 props；禁数据/Router/effect）",
  },
  "surfaces-views": {
    base: "packages/surfaces/src/views",
    allowed: (spec, isRelative) =>
      isRelative || isReactRuntime(spec) || isCoreSpec(spec) || isUiKitSpec(spec),
    banned: ["effect", "@tanstack/react-router"],
    forbid: (spec) => {
      if (spec.startsWith(".") && /(^|\/)chrome(\/|$)/.test(spec)) {
        return "禁止视图导入 chrome（壳归 L6，不反向依赖）";
      }
      if (
        spec === "@lynxland/uikit-surfaces/chrome" ||
        spec.startsWith("@lynxland/uikit-surfaces/chrome/")
      ) {
        return "禁止视图导入 chrome（壳归 L6，不反向依赖）";
      }
      return null;
    },
    label: "surfaces views（禁 Router/chrome/effect）",
  },
  "ui-shadcn": {
    base: "packages/ui-shadcn/src",
    allowed: (spec, isRelative) =>
      isRelative ||
      isReactRuntime(spec) ||
      spec.startsWith("@base-ui/") ||
      isSurfacesSpec(spec) ||
      spec === "clsx" ||
      spec.startsWith("clsx/") ||
      spec === "tailwind-merge" ||
      spec.startsWith("tailwind-merge/") ||
      spec === "class-variance-authority" ||
      spec.startsWith("class-variance-authority/") ||
      spec === "lucide-react" ||
      spec.startsWith("lucide-react/"),
    banned: ["effect", "@lynxland/uikit-react", "@tanstack/react-router", "@tanstack/react-query"],
    label: "ui-shadcn（相对 + react/base-ui/surfaces + 样式工具；禁 effect/绑定/Router/query）",
  },
  "ui-plain": {
    base: "packages/ui-plain/src",
    allowed: (spec, isRelative) => isRelative || isReactRuntime(spec) || isSurfacesSpec(spec),
    banned: ["effect", "@lynxland/uikit-react", "@tanstack/react-router", "@tanstack/react-query"],
    label: "ui-plain（相对 + react + surfaces；禁 effect/绑定/Router/query）",
  },
  "preset-console": {
    base: "packages/preset-console/src",
    allowed: (spec, isRelative) =>
      isRelative ||
      isReactRuntime(spec) ||
      spec.startsWith("@tanstack/") ||
      isCoreSpec(spec) ||
      isReactPackageSpec(spec) ||
      isSurfacesSpec(spec) ||
      spec === "@lynxland/uikit-ui-shadcn" ||
      spec.startsWith("@lynxland/uikit-ui-shadcn/"),
    banned: ["effect"],
    forbid: (spec) =>
      isConcreteUiSpec(spec)
        ? `禁止 preset 直接导入具体 UI 库 "${spec}"（经 surfaces / UI adapter）`
        : null,
    label: "preset-console（相对 + react/tanstack/core/react/surfaces/ui-shadcn；禁具体 UI 库/effect）",
  },
  meta: {
    base: "packages/meta/src",
    allowed: (spec, isRelative) => isRelative || isCoreSpec(spec) || isPresetSpec(spec),
    banned: ["effect"],
    label: "meta（相对 + core 类型 + preset；禁 effect）",
  },
};

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

for (const [layer, rule] of Object.entries(LAYER_RULES)) {
  let files = [];
  try {
    files = [...walk(join(root, rule.base))];
  } catch {
    continue; // 目录不存在（如 surfaces/registry 未建）
  }
  for (const file of files) {
    if (file.includes("routeTree.gen")) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1];
      const isRelative = spec.startsWith(".") || spec.startsWith("/");
      const banned = rule.banned?.some((b) => spec === b || spec.startsWith(`${b}/`)) ?? false;
      if (banned) {
        violations.push(`[${layer}] ${relative(root, file)}: 禁止导入 "${spec}"（${rule.label}）`);
        continue;
      }
      const forbidden = rule.forbid?.(spec, file);
      if (forbidden) {
        violations.push(`[${layer}] ${relative(root, file)}: ${forbidden}（${rule.label}）`);
        continue;
      }
      if (!rule.allowed(spec, isRelative)) {
        violations.push(
          `[${layer}] ${relative(root, file)}: 不允许导入 "${spec}"（${rule.label}）`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`layer-check: ${violations.length} 处违规`);
  for (const violation of violations) console.error(`  ✖ ${violation}`);
  process.exit(1);
}
console.log(
  "layer-check: 全部通过（kernel 零依赖 / core 零 effect / react 禁 Router（/router 除外）/ ui adapter contract）",
);
