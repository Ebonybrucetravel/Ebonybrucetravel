# Baseline migration history

Use this when the database was updated with `prisma db push` and you need migration history to match.

## 1. Fix the dispute-evidence drift (if needed)

If Prisma had previously reported drift for `bookings` (cancellationDeadline, etc.), mark that migration as applied:

```bash
npx prisma migrate resolve --applied 20260212160000_booking_operations_and_dispute_evidence
```

## 2. Mark the suspend/notes migration as applied

`db push` already added `suspendedAt` and `internalNotes` to `users`. Mark the migration as applied without running it:

```bash
npx prisma migrate resolve --applied 20260218100000_add_customer_suspend_and_notes
```

## 3. Verify

```bash
npx prisma migrate status
```

Should show all migrations as applied. Future `prisma migrate dev` and `prisma migrate deploy` will work normally.
