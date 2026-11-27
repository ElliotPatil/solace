# Solace Cloud Data Architecture

## Status
- Account profile resolver: implemented.
- UID-scoped Firestore rules: implemented.
- Firestore emulator security tests: implemented and passed in CI on 2026-11-27.
- Local IndexedDB account partitioning: implemented on main (CI verification pending).
- Cloud sync: intentionally not enabled.
- Firebase rules deployment: pending credentials/owner approval.
- Storage media uploads/rules: pending Firebase Storage setup and credentials.

## Local account isolation
The local database is now scoped by the authenticated Firebase UID:
- Signed-out/guest records continue to use `solace-local`.
- Signed-in records use `solace-local-user-{encoded UID}`.
- Switching auth state selects the matching database and reloads data.
- Legacy records are retained in the guest database and are not automatically attributed to any account; automatic migration could expose data to the wrong account.

## Identity and ownership
- Firebase Authentication UID is the canonical account ID.
- Cloud user data is nested under `users/{uid}`.
- Client code must never choose a different user's UID for cloud paths.
- Firestore rules enforce `request.auth.uid == uid`; UI checks are not a security boundary.

## Firestore structure
```
users/{uid}                         # profile metadata
users/{uid}/entries/{entryId}        # memories, reflections, experiences
users/{uid}/collections/{collectionId} # collection metadata
users/{uid}/drafts/{draftId}         # draft records
users/{uid}/moodCheckins/{checkinId} # mood check-ins
users/{uid}/quietMoments/{momentId}   # quiet moments
```

## Field mapping
Entries require `id`, `kind`, `title`, `body`, `createdAt`, `privacy`; optional `collectionId`, `pinned`, and `tags`. Drafts similarly require their content, timestamps and privacy. Collections contain id/name/description/createdAt. Mood records contain id/mood/createdAt and optional note. Quiet moments contain id/text/createdAt.
Local-only media payloads (`photos`, `audioData`, `audioName`) must not be written to Firestore. Media requires separate Firebase Storage upload and metadata handling. Storage rules now restrict media to owner paths, allow image/audio content types, cap individual uploads at 10 MiB, and deny unmatched paths.

## Security principles
1. Authenticate all private-data operations.
2. Restrict reads and writes to the current UID's path.
3. Default deny all unrecognized paths.
4. Validate fields, types, enumerations, and payload sizes.
5. Do not store media binaries/base64 in Firestore.
6. Do not treat client timestamps as authoritative.
7. Do not enable broad unvalidated collection rules.

## Sync prerequisites and design
Sync remains off until the following are implemented and tested:
- UID-scoped local data (now implemented; verification pending).
- Idempotent upload/download with stable document IDs.
- Conflict handling using version/updatedAt metadata and conservative merge policy; never silently replace newer local edits.
- Offline retry/backoff and retryable error classification.
- Account-switch safety tests proving operations cannot cross UID boundaries.
- Media Storage upload/download client integration, ownership rules (rules added), size/type validation (rules added), and metadata references.

## Deployment
Firestore rules have passed the CI emulator tests, but they have not been deployed. Deploy only after confirming the Firebase project, inspecting the exact rules, and using authenticated deployment credentials. No production sync is enabled as part of this commit.
