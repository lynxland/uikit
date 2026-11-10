# Changesets

This repo uses [changesets](https://github.com/changesets/changesets) for versioning and npm releases.

```bash
pnpm changeset          # describe a change + affected packages/bump
pnpm version-packages   # apply versions/changelogs (usually done by the release PR)
pnpm release            # publish packages (CI/release workflow)
```

- **fixed group**: `@lynxland/uikit-core` / `-react` / `-surfaces` / `-preset-console` /
  `@lynxland/uikit` move together.
- **independent**: `@lynxland/uikit-ui-shadcn` / `-ui-plain` / `-testing` / `-cli`.
- `demo` is private and ignored.
