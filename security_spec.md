# FaithTrack Firestore Security Specification

## 1. Data Invariants
1. **Default Member & Pending Activation**: Every self-registered `users/{uid}` document MUST be created with `uid == request.auth.uid`, `role == 'member'`, and `status == 'pending'`. Self-escalation to `admin` or `super_admin` and self-activation (`status: 'active'`) are rejected.
2. **Email Verification Gate**: Standard data reads/writes (events, attendance, prayer wall, RSVPs, notifications) require `request.auth != null && request.auth.token.email_verified == true`.
3. **Strict PII Isolation**: `members/{memberId}` and `users/{uid}` contain personal contact details. Only the document owner (`uid == request.auth.uid` / `resource.data.userId == request.auth.uid`) or a verified Admin (`users/{request.auth.uid}.role in ['admin', 'super_admin'] && status != 'suspended'`) may read them.
4. **Confidential Prayer Isolation**: `prayer_requests/{prayerId}` with `isConfidentialToPastors == true` can ONLY be read by the author (`resource.data.authorId == request.auth.uid`) or a verified Admin.
5. **Owner-Scoped List Queries**: Collection `list` queries on `attendance`, `notifications`, and `activity_registrations` strictly evaluate `resource.data.userId == request.auth.uid` unless the caller is an Admin, eliminating client-side filtering trust and `get()` cost explosions inside `allow list`.
6. **Admin Protection**: Only verified Admins can modify `users/{uid}` roles/statuses, `events`, `departments`, `groups`, `announcements`, `settings`, or read/create `auditLogs`, `email_dispatches`, and `notification_audit_logs`. `super_admin` records cannot be downgraded, and an Admin cannot strip their own admin role.

## 2. Dirty Dozen Attack Payloads (Must Return PERMISSION_DENIED)
1. **Self-Admin Registration**: `POST /users/{uid}` with `{ uid, email, role: 'admin', status: 'active' }` -> Denied (`role != 'member'`).
2. **Self-Activation Bypass**: `POST /users/{uid}` with `{ uid, email, role: 'member', status: 'active' }` -> Denied (`status != 'pending'`).
3. **Member Role Escalation**: `PATCH /users/{uid}` by non-admin setting `{ role: 'admin' }` -> Denied (Admin-only update).
4. **Unverified User Prayer Post**: `POST /prayer_requests/{id}` where `request.auth.token.email_verified == false` -> Denied.
5. **Cross-User PII Read**: `GET /members/{otherMemberId}` by a regular member where `resource.data.userId != request.auth.uid` -> Denied.
6. **Confidential Prayer Leak**: `LIST /prayer_requests` by a regular member without `where('isConfidentialToPastors', '==', false)` or `where('authorId', '==', uid)` -> Denied.
7. **Shadow Field Injection on Prayer**: `POST /prayer_requests/{id}` with extra field `{ isVerifiedPastor: true }` -> Denied (`hasOnly`).
8. **Attendance Spoofing**: `POST /attendance/{id}` by a regular member setting `userId: 'other_uid'` -> Denied (`incoming().userId == request.auth.uid`).
9. **Member Profile Status Tampering**: `PATCH /members/{id}` by owner changing `{ status: 'active' }` or `{ membershipNumber: 'FT-HACK' }` -> Denied.
10. **Path ID Poisoning**: `POST /events/../../users/evil` or 200-char junk ID -> Denied (`isValidId`).
11. **Non-Admin Event Mutation**: `PATCH /events/{id}` or `DELETE /events/{id}` by a `'member'` role user -> Denied.
12. **Audit Log Tampering**: `PATCH` or `DELETE /auditLogs/{id}` even by Admin -> Denied (`false`).
