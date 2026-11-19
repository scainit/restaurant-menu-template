# Restaurant Menu API\n\nCloudflare Worker API backed by D1. Routes include public menu reads, username/password login, secure HttpOnly sessions, password change, and authenticated category/product CRUD. Bind the D1 database as `DB`. R2 image upload will be enabled after the account's R2 service is activated.\n

## Authentication and authorization

- `POST /api/auth/bootstrap`: one-time manager bootstrap. Requires the Cloudflare Worker secret `BOOTSTRAP_SECRET`, the D1 migration `0002_staff_management_bootstrap.sql`, and the `X-Bootstrap-Secret` header. Rate-limited and guarded by a one-time D1 claim.
- `GET /api/auth/me`: returns username, display name, role, and first-login password-change state.
- `GET /api/admin/users`: manager only.
- `POST /api/admin/users`: manager only; creates manager or staff accounts.
- `PATCH /api/admin/users/:id`: manager only; supports `set-active`, `set-role`, `reset-password`, and `update-profile`.
- Category/product reads require an active authenticated session. Category/product mutations additionally require `role=manager`.
- Staff-role accounts are read-only in the dashboard. Deactivation and password reset revoke the affected user's sessions. Password reset enforces a password change at next sign-in.
- Passwords use PBKDF2-SHA256, 310,000 iterations, and a cryptographically random 16-byte salt.
