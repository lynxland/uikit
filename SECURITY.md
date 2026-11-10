# Security Policy

## Supported versions

The project is pre-1.0 and does not yet provide long-term security branches.
Security fixes land on the latest published minor.

## Reporting a vulnerability

Please do **not** open a public issue for a security vulnerability.

Report it privately to the maintainers via the security contact configured on
the GitHub repository (Security → Report a vulnerability). Include:

- affected package and version,
- a minimal reproduction,
- impact and attack surface,
- any suggested fix or mitigation.

We will acknowledge the report, assess severity, and coordinate a fix and
disclosure window. Please avoid public disclosure until a fix is available.

## Scope

In scope:

- `@lynxland/uikit-*` packages,
- registry/UI adapter source distributed from this repo,
- default preset and token files.

Out of scope:

- vulnerabilities in consumer-owned application code,
- third-party UI libraries (Base UI, TanStack, etc.) — report upstream,
- misconfiguration of consumer backends/auth.
