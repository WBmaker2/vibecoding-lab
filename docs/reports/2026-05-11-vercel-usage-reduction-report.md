# Vercel Usage Reduction Report

## Summary

- Public gallery now renders from `src/data/public-apps.json` instead of reading the app repository on every `/` request.
- The public home route exports `dynamic = "force-static"` and builds as a static route.
- App card thumbnails use native `<img>` tags and static-friendly URLs instead of `next/image`.
- Admin mutations revalidate `/admin` only; they no longer revalidate `/`.
- Wildcard remote image optimization is removed from `next.config.ts`.
- A refresh script, `npm run apps:export-static-gallery`, can materialize live thumbnails into `public/app-thumbnails/` and rewrite the static snapshot safely.
- The current committed snapshot was regenerated from Postgres and contains the existing 36 registered apps.

## Verification

- `npm test`: PASS, 25 files and 79 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `node --check scripts/apps-export-static-gallery.mjs`: PASS.
- `npm run apps:export-static-gallery -- --base-url https://www.vivehong.shop` without `POSTGRES_URL` or `--backup`: expected failure, no snapshot source.
- `npm run apps:export-static-gallery -- --base-url https://www.vivehong.shop` with `POSTGRES_URL`: PASS, rewrote `src/data/public-apps.json`.
- DB-to-snapshot comparison: PASS, 36 DB apps, 36 snapshot apps, 0 missing, 0 extra, 0 metadata mismatches.
- Snapshot thumbnails: 36 local `/app-thumbnails/...` references, 0 remote references, 0 null thumbnails.
- Build route output shows `/` as `○ (Static) prerendered as static content`.
- Browser smoke on `http://127.0.0.1:3011`: PASS.
  - Desktop width: 36 app cards, 36 real app links, 36 `/app-thumbnails/...` card images, 0 `/_next/image` card images.
  - Mobile width 390px: 36 app cards, 36 `/app-thumbnails/...` card images, 0 `/_next/image` card images.

## Expected Vercel Impact

- Fewer public DB/repository reads for `/`.
- Fewer ISR writes caused by app create/update/delete/tag changes.
- Fewer Image Optimization transformations from public app card thumbnails.
- Less Fast Origin Transfer pressure from bots and preview crawlers repeatedly loading the public gallery.

## Operational Note

The committed `src/data/public-apps.json` is the deploy-time source of truth for the public gallery. After changing app cards in admin or before a production release, refresh the snapshot:

```bash
POSTGRES_URL=... npm run apps:export-static-gallery -- --base-url https://www.vivehong.shop
```

Then inspect `src/data/public-apps.json` and `public/app-thumbnails/` before committing. The export script also supports admin backup conversion:

```bash
npm run apps:export-static-gallery -- --backup path/to/admin-backup.json --base-url https://www.vivehong.shop
```

The export script intentionally fails without writing the snapshot when it cannot load a DB or backup source or safely materialize same-origin/internal thumbnails.

## Remaining Tradeoff

Admin changes are no longer instantly reflected on the public gallery. This is intentional for usage reduction: public updates now happen through the explicit snapshot refresh and deployment flow.
