# Solace Layer 2 — Secure Cloud Data Architecture

## Status
Layer 2 planning and schema definition. No memories are uploaded or synced in this layer.

## Identity and ownership
- Firebase Authentication UID is the canonical account ID.
- Cloud user data is nested under `users/{uid}`.
- Client code must never choose a different user's UID for cloud paths.
- Firestore security rules enforce `request.auth.uid == uid`; UI checks are not a security boundary.

## Firestore structure
```
users/{uid}                         # profile metadata (Layer 1)
users/{uid}/entries/{entryId}        # memories, reflections, experiences
users/{uid}/collections/{collectionId} # collection metadata
users/{uid}/drafts/{draftId}         # draft records
users/{uid}/moodCheckins/{checkinId} # mood check-in records
users/{uid}/quietMoments/{momentId}   # quiet-moment records
```

IDs remain the local record IDs, allowing later sync to match records without duplication.

## Field mapping (based on src/db.ts)

### entries
- Required: `id`, `kind`, `title`, `body`, `createdAt`, `privacy`
- Optional: `collectionId`, `pinned`, `tags`
- Local-only media payloads: `photos`, `audioData`, `audioName`. These must not be copied into Firestore. Media will be handled separately through Firebase Storage in a later layer, with metadata references in Firestore.

### collections
- Required: `id`, `name`, `description`, `createdAt`

### drafts
- Required: `id`, `kind`, `title`, `body`, `createdAt`, `updatedAt`, `privacy`
- Optional: `collectionId`, `tags`
- Media payloads remain local until Storage upload and metadata handling are implemented.

### moodCheckins
- Required: `id`, `mood`, `createdAt`
- Optional: `note`

### quietMoments
- Required: `id`, `text`, `createdAt`

## Security rules principles
1. Require authentication for every private-data operation.
2. Allow access only within the authenticated UID's own subcollections.
3. Default deny all other paths.
4. Validate allowed fields and types for each record before accepting writes.
5. Reject unexpected fields, invalid enum values, and excessively large strings/arrays.
6. Never store base64 image/audio payloads in Firestore.
7. Do not treat client timestamps as authoritative security data.
8. Do not enable broad `users/{uid}/{collection}/{doc}` read/write rules without per-collection validation.

## Sync behavior (future layer)
- Cloud sync is not active in Layer 2.
- Local IndexedDB remains the current source of truth.
- The future sync engine must be UID-scoped, idempotent, merge-aware, and handle offline retries.
- Account switching must isolate local data by UID before sync is enabled; this is a required pre-sync safety milestone.
- Sync must not automatically overwrite newer local edits with older cloud versions.

## Media handling (future layer)
- Store photo/audio binaries in Firebase Storage, not Firestore.
- Storage paths must be UID-scoped (e.g. `users/{uid}/photos/{mediaId}`).
- Storage rules must require the matching authenticated UID and enforce file type/size limits.
- Firestore records should hold media metadata and storage paths only.

## Layer 2 work sequence
1. Document and review this data contract.
2. Implement restrictive, per-collection Firestore rules and validate them with the Firestore Emulator or Rules Playground.
3. Keep memory collection writes disabled in the app until local account isolation and sync safeguards are implemented.
4. Review the rules, then deploy them deliberately.
