# Static Gallery Blob Materialization Fix

## Goal

Allow the static gallery exporter to download uploaded Vercel Blob thumbnails
under the current Node.js DNS lookup behavior, then regenerate the public
snapshot with local thumbnail assets.

## Scope

1. Update the pinned DNS lookup callback to honor Node's `all` lookup option
   while continuing to return the validated public address only.
2. Add a regression test covering the array-shaped lookup callback result.
3. Re-run the static gallery export, database/snapshot verification, focused
   tests, lint, build, and local public-page checks.

## Safety

- Preserve the existing SSRF rule: DNS validation still checks every resolved
  address before the connection is pinned to one validated public address.
- Do not alter app metadata or use runtime thumbnail API routes.
- Do not commit, push, or deploy unless separately requested.
