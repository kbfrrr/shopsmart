# Dependency review

Review date: November 20, 2026. Checkout: `main`, `6174e37`.

Online command: `npm audit --workspace backend --omit=dev --offline=false --json`.
The [saved response](evidence/backend-audit.json) reports **10 affected packages:
one critical, six high, three moderate**. Exit code 1 indicates findings.
An initial offline result was discarded; this review uses the online result.

| Package | Severity | Finding and disposition |
| --- | --- | --- |
| proxy-addr | Critical | IP spoofing with IPv4-mapped IPv6 trust subnet handling. ShopSmart trusts one proxy hop and keeps the API private; this does not replace patching. |
| body-parser | High | Denial of service involving trailing bytes after compressed bodies; patch available. |
| zod | High | Memory exhaustion for oversized constrained collections; patch available. Request-size limits do not establish immunity. |
| deepmerge-ts | High | Stack exhaustion on recursive merges; Prisma dependency chain. |
| effect | High | Regular-expression denial of service in schema handling; Prisma dependency chain. |
| @prisma/config | High | Affected through deepmerge-ts and effect. |
| prisma | High | Affected through @prisma/config. The CLI ships in the image for migrations; it is not absent from deployment. |
| ip-address | Moderate | Address-family checks, large diagnostics, and quadratic parsing; patch available. |
| morgan | Moderate | Log injection in quoted fields; patch available. Review hosted logs before sharing. |
| qs | Moderate | Denial of service in comma-format serialization for certain values; patch available. |

Advisory links, affected versions and proposed fixes are in the saved JSON.
This review does not establish exploitability of every advisory through ShopSmart.

No package versions were changed during evidence preparation. Keep this release
restricted for the demonstration; do not describe it as security-cleared for
unrestricted public use. Apply compatible updates in a user-created branch, then
rerun lint, tests, builds, migration and authentication checks before deployment.
The audit proposes Prisma 7.10.1 for part of the chain, a major change from Prisma
6 that needs separate migration review. Do not apply a forced audit fix to the
deployed release without that work.
