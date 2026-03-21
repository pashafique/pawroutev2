# PawRoute V2.0 — Production Runbook

## Service Overview

| Service | URL | Host | Tech |
|---------|-----|------|------|
| API | https://api.pawroute.com | Fly.io | Fastify + Node.js |
| Web App | https://pawroute.com | Vercel | Next.js 14 |
| Admin Panel | https://admin.pawroute.com | Vercel | React + Vite |
| Database | db.[ref].supabase.co | Supabase | PostgreSQL 15 |
| Redis / Queue | [ref].upstash.io | Upstash | Redis 7 |
| Error Tracking | sentry.io | Sentry | — |

---

## Health Checks

```bash
# API health
curl https://api.pawroute.com/health

# API readiness (checks DB + Redis)
curl https://api.pawroute.com/ready

# Expected: { "status": "ok", "version": "2.0.0", "timestamp": "..." }
```

---

## Common Incidents

### 1. API is down / returning 500s

**Check:**
```bash
# View live logs
flyctl logs -a pawroute-api

# Check VM health
flyctl status -a pawroute-api

# Check machine count
flyctl machines list -a pawroute-api
```

**Restart:**
```bash
flyctl machines restart -a pawroute-api
```

**Rollback to previous release:**
```bash
flyctl releases list -a pawroute-api
flyctl deploy --image registry.fly.io/pawroute-api:<prev-version> -a pawroute-api
```

---

### 2. Database connection failures

**Symptoms:** `P1001 Can't reach database server`, 503 errors on booking endpoints.

**Check:**
- Supabase dashboard → Project → Database → Health
- `DATABASE_URL` secret in Fly.io: `flyctl secrets list -a pawroute-api`

**Mitigations:**
- Supabase auto-resumes from pause after 7 days inactivity (free tier) — trigger resume by visiting dashboard
- Check Prisma connection pool: default is 5 connections (free tier max is ~20)

---

### 3. Redis / BullMQ jobs stuck

**Symptoms:** Appointment reminders not sending, slot locks not expiring.

**Check:**
```bash
# Redis ping via Upstash console or
curl https://[ref].upstash.io/ping -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
```

**Clear stuck jobs:**
- BullMQ dashboard (if bull-board is enabled): `/admin/queues`
- Or manually: use Upstash console to `DEL` specific keys

---

### 4. Stripe webhook not processing

**Symptoms:** Payments show as PENDING after successful card charge.

**Check:**
- Stripe dashboard → Developers → Webhooks → Recent deliveries
- Check `STRIPE_WEBHOOK_SECRET` matches the endpoint secret
- Verify endpoint URL: `https://api.pawroute.com/api/v1/payments/webhook/stripe`

**Replay:**
```bash
# Use Stripe CLI to replay events
stripe events resend <event_id>
```

---

### 5. FCM push notifications failing

**Symptoms:** Users not receiving appointment confirmations/reminders.

**Check:**
- Sentry for `FCM error` events
- Firebase Console → Cloud Messaging → Send test message

**Common causes:**
- `FIREBASE_PRIVATE_KEY` secret has literal `\n` instead of newlines — verify with `flyctl secrets show`
- User has disabled notifications on their device
- FCM token expired — user must re-open app to refresh

---

### 6. Vercel web/admin deployment failed

**Check:**
```bash
vercel --prod --debug
# or
gh run list --repo pawroute/pawroutev2 --workflow=deploy.yml
```

**Common causes:**
- Missing environment variable in Vercel project settings
- Build error: check `vercel logs <deployment-url>`
- Sentry auth token expired (source map upload step)

---

## Deployment

### API (Fly.io)
```bash
# Manual deploy (from repo root)
flyctl deploy --dockerfile docker/Dockerfile.api --remote-only -a pawroute-api

# Scale up during high traffic
flyctl scale count 3 -a pawroute-api

# View current scale
flyctl scale show -a pawroute-api
```

### Web + Admin (Vercel)
```bash
# Triggered automatically on push to main
# Manual:
cd apps/web && vercel --prod
cd apps/admin && vercel --prod
```

### Database migrations
```bash
# Always test on preview first
pnpm --filter=@pawroute/api db:migrate:deploy

# Verify migration applied
pnpm --filter=@pawroute/api exec prisma migrate status
```

---

## Monitoring

| What | Where |
|------|-------|
| Error rate, latency | Sentry → Performance |
| Server logs | `flyctl logs -a pawroute-api` |
| DB query times | Supabase dashboard → Reports |
| Redis usage | Upstash console |
| Stripe revenue | Stripe dashboard → Reports |
| Build status | GitHub Actions → pawroutev2 |

---

## Secrets Reference

All secrets stored in:
- **API**: Fly.io secrets (`flyctl secrets list -a pawroute-api`)
- **Web/Admin**: Vercel environment variables (project settings)
- **Mobile**: Expo secrets + app.json `extra` field

See `.env.example` for the full list with descriptions.

---

## Escalation

1. Check Sentry for the error with full stack trace
2. Check `flyctl logs` for API-level errors
3. Check Supabase and Upstash dashboards for infrastructure issues
4. If data loss suspected: Supabase → Database → Backups (daily automatic)
