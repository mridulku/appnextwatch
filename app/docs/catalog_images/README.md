# Gym Catalog Images Pipeline

This folder stores generated artifacts for the gym image ingestion pipeline.

## Artifacts

- `candidates.json`: raw candidates fetched from Wikimedia/Unsplash per entity.
- `selections.json`: scored picks with confidence and alternates.
- `review_queue.json`: low-confidence rows to review manually.
- `mirror_results.json`: upload/mirroring results to Supabase storage.
- `report.json`: latest coverage summary by entity.

## Run order

1. `npm run gym:images:collect`
2. `npm run gym:images:apply`
3. `npm run gym:images:report`

## Notes

- `UNSPLASH_ACCESS_KEY` is optional. If missing, only Wikimedia is used.
- `SUPABASE_SERVICE_ROLE_KEY` is required for mirror/upload and metadata writeback.
