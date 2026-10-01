# Firestore Security Specification for 《拾年》

## 1. Data Invariants
- A UserProfile can only be read and written by the authenticated user (`request.auth.uid == userId`) or an admin. Users cannot self-elevate to admin role in database documents.
- UserBackup documents reside under `/users/{userId}/backups/{backupId}`. Only the owner (`request.auth.uid == userId`) can create, read, list, and delete their backups.
- AppVersion documents (`/app_versions/{versionId}`) can be read and listed by all users (publicly or signed-in), but can only be created, updated, or deleted by verified administrators in `/admins/{adminUid}`.
- SystemNotice documents (`/system_notices/{noticeId}`) can be read and listed by all users, but write access is restricted to verified administrators.
- AdminRecord documents (`/admins/{adminUid}`) can only be read by signed-in users (to check their admin status) and written only by existing admins or initial system bootstrap.

## 2. Dirty Dozen Payload Scenarios & Mitigation
1. **Unauthenticated Read to User Backups**: Blocked by `request.auth != null && request.auth.uid == userId`.
2. **Cross-User Backup Tampering**: User B attempting to write to `/users/UserA/backups/b1` is blocked by path matching.
3. **Role Self-Escalation**: User attempting to write `role: "admin"` in their profile is gated so role checks rely on `/admins/{uid}` existence.
4. **Oversized Backup Payload Attack**: Guarded by `data.dataPayload is string && data.dataPayload.size() <= 1048576`.
5. **Unauthorized Version Publishing**: Regular user attempting to post a malicious update is blocked by `isAdmin()`.
6. **Fake System Notice Injection**: Non-admin attempting to create a fake notice is blocked by `isAdmin()`.
7. **Invalid Path ID Injection**: Guarded by `isValidId(id)`.
8. **Malicious JSON Array/Field Pollution**: Guarded by `hasOnly()` allowed keys check.
9. **Unverified Email Spoofing**: Admin actions require verified email / explicit document in `/admins/{uid}`.
10. **Shadow Key Update on Versions**: Gated by `affectedKeys().hasOnly(...)`.
11. **Blanket Query Scraping**: Collection queries enforce resource filtering.
12. **Catch-All Default Deny**: `match /{document=**} { allow read, write: if false; }`.
