# Planity API Enhancements

## Auth
- `PATCH /api/v1/auth/profile` — update name, avatar, phone, locale (JWT required).
- Password reset now stores hashed tokens; reset flow uses `token` + `email`.

## Events
- `PATCH /api/v1/events/:id/reschedule` — update event date/location.
- `PUT /api/v1/events/:id/budget` & `GET /api/v1/events/:id/budget` — manage budget breakdown.
- `GET /api/v1/events/calendar?from=&to=` — planner/admin calendar view (*planner scope defaults to their own events*).
- Automatic email notifications fire on event/task/vendor changes.

## Vendors
- `DELETE /api/v1/vendors/:id/photos?photo=` — remove uploaded photo (planner/admin).

## Contracts
- `GET /api/v1/contracts?eventId=` — list contracts visible to the caller.
- Contracts now support optional `vendorId` link and send email notifications on create/sign.

## Payments
- `POST /api/v1/payments/intent` — accepts `referenceType` (`event|contract`) + `referenceId`.
- `POST /api/v1/payments/status` — mark referenced event/contract as paid/unpaid.

## Reviews
- Review creation checks that the client has an event/contract with the vendor.

## Admin
- User controls: `PATCH /admin/users/:id/role`, `PATCH /admin/users/:id/status`.
- Vendor moderation: `PATCH /admin/vendors/:id/verify`, `PATCH /admin/vendors/:id/status`, `GET /admin/vendors/pending`.
- Disputes: `POST /admin/disputes`, `GET /admin/disputes`, `PATCH /admin/disputes/:id`.
- Reports: CSV exports for users/vendors/events under `/admin/reports/*`.
- Meta options: `GET/POST/PATCH/DELETE /admin/content/meta-options` (configures event types/service categories).

## Models
- Users track `isActive`, audit timestamps, locale, phone.
- Events store budget items (`budgetItemsTotal`) and payment status flag.
- Vendors include `isActive`; Meta options & disputes stored in new collections.

> Run `npm run seed` after pulling to populate default users, vendors, and localized meta options.
