# Security Specification & Payload-First Verification (UPT Pelatihan Pertanian)

## Data Invariants
1. **Identity Integrity**: Every `outgoing_letters` document must record `createdByUid == request.auth.uid` on creation, and `createdByUid` and `createdAt` are immutable forever.
2. **Verified Email Mandate**: Unverified accounts (`email_verified != true`) and unauthenticated callers are strictly denied all reads and writes.
3. **PII Isolation**: `staff_profiles/{uid}` (containing `email` and `nip`) is readable only by the profile owner or an admin (`list` is disabled). `staff_directory/{uid}` contains zero PII.
4. **Immutable Issued Numbers**: Once an `outgoing_letters` document is created, `year`, `month`, `letterDate`, `sequenceNumber`, `subNumber`, `sortKey`, `classificationCode`, `unitCode`, and `fullNumber` cannot be modified.
5. **Monotonic Sequence Counters**: `yearly_counters/{yearId}` cannot have `lastSequence` or `totalIssued` decremented, and `date_anchors/{anchorId}` cannot have `nextSisipan` decremented.
6. **Terminal State Locking**: Once an outgoing letter reaches `status == 'batal'`, non-admin staff cannot edit or re-activate it.
7. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time`.

## The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /outgoing_letters/letter-1` with `auth == null`.
2. **Unverified Email Write**: `CREATE /outgoing_letters/letter-1` with `auth.token.email_verified == false`.
3. **Identity Spoofing**: `CREATE /outgoing_letters/letter-1` with `createdByUid: "other-staff-uid"`.
4. **Self-Assigned Admin Role**: `CREATE /staff_profiles/{uid}` with `role: "admin"` by non-admin user.
5. **PII Cross-User Scrape**: `GET /staff_profiles/victim-uid` or `LIST /staff_profiles` by non-admin user.
6. **Shadow Ghost Field**: `CREATE /outgoing_letters/letter-1` containing extra key `isAdminApproved: true`.
7. **Silent Letter Number Tampering**: `UPDATE /outgoing_letters/letter-1` changing `fullNumber` or `sequenceNumber`.
8. **Silent Date Backdating After Issue**: `UPDATE /outgoing_letters/letter-1` changing `letterDate` after creation.
9. **Counter Rollback Attack**: `UPDATE /yearly_counters/2026` setting `lastSequence` lower than `existing().lastSequence`.
10. **Terminal State Bypass**: Non-admin attempting `UPDATE /outgoing_letters/letter-1` when `existing().status == 'batal'`.
11. **Fake Client Timestamp**: `CREATE /outgoing_letters/letter-1` with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
12. **Resource Poisoning / Path ID Injection**: `CREATE /outgoing_letters/invalid$id#1500chars...` exceeding 128 chars or failing `^[a-zA-Z0-9_\-]+$`.
