# Operations runbook, incident response & disaster recovery

## Monitoring (production)
Watch: web availability, DB/storage health, job queue + failed jobs, backup failures, search
failures, integration/calendar/notification failures, docket-monitor failures, suspicious logins,
repeated authorization failures, storage limits, elevated error rate. Route alerts to a secure
channel. **Never include document contents or secrets in alerts.** System Health page
(Administration → System Health) surfaces DB/search/backup/jobs/security at a glance.

## Incident response (per incident: severity → contain → notify → rotate → restore → verify → review)
- **Service/DB/storage outage:** check platform status; fail over / restore from latest verified backup.
- **Security incident / credential compromise:** rotate affected secrets, revoke sessions + companion
  devices + integration tokens, review SecurityEvent log, notify user.
- **Companion-device loss:** revoke the device (token stops working immediately).
- **Accidental deletion:** restore from Trash (30 days) or a verified backup.
- **Failed migration:** restore the pre-migration backup; fix; re-run on a copy first.
- **AI provider breach concern:** disable the provider globally; case AI mode → disabled.

## Disaster-recovery exercise (staging; never destructive against production without approval)
1. Create backup → 2. verify checksum → 3. restore DB into a **temporary** environment →
4. restore file inventory → 5. rebuild search index (`reindex`) → 6. confirm case relationships →
7. confirm audit history → 8. confirm generated documents → 9. confirm auth → 10. record recovery
time + failures. The app implements create/verify/**restore-preview** (simulated); a real restore
uses the managed Postgres PITR + object-storage versioning.

## Data retention (configurable, conservative defaults)
Trash 30d; audit/security logs retained; never purge case documents merely because a temporary
retention window expires; never delete the only successful backup.

## Release process
CI green → staging deploy → smoke test → manual protected promotion → post-deploy health check →
rollback = redeploy prior build. Take a backup before any material schema/infra change.
