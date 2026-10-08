# deploy-dev deployment

Every push to `deploy-dev` in `pitchakornofficial-prog/E-Tikket` triggers
`.github/workflows/deploy-dev.yml`. Target: https://e-ticket.phatysd.me,
EC2 `i-0b8de89cc3f31ba14` in `ap-southeast-2` (Sydney).

The workflow installs from the lockfile, applies migrations to a disposable CI
SQLite database, runs lint/typecheck/build on Ubuntu 24.04 with Node 22, then
packages Next.js standalone output including public/static assets and Thai PDF
fonts. Only a validated Linux build is transferred to EC2.

AWS authentication uses GitHub OIDC and the `E-TikketDeployDev` IAM role. Its trust
policy matches the observed immutable owner/repository-ID subject for this repo
and only `refs/heads/deploy-dev`; permissions allow
instance discovery in Sydney and ephemeral EC2 Instance Connect access as Ubuntu
on this one instance. There are no long-lived AWS keys or SSH private keys in
GitHub. The verified public SSH host key and other public target values are
committed in the workflow because this collaborator cannot administer repo vars.
Policy sources: `aws-trust-policy.json`, `aws-permissions-policy.json`.

## Host and data

This pipeline assumes the existing E-Tikket host is provisioned:

- Node: `/opt/e-tikket/node/bin/node` (22)
- systemd: `e-tikket.service`, port 3100 on loopback
- Nginx/Let's Encrypt: `e-ticket.phatysd.me`
- private environment: `/opt/e-tikket/shared/app.env`, mode 0600
- SQLite: `/opt/e-tikket/shared/app.db`
- private artifacts: `/opt/e-tikket/shared/artifacts`
- releases: `/opt/e-tikket/releases/<commit>/app`
- active release: `/opt/e-tikket/current`

The host's secrets remain on the host. URL variables are set to the public domain;
`APP_ORIGIN` keeps middleware redirects off localhost. Configure SMTP/Resend on
the host separately to enable actual email delivery. No seed runs during deploy.

Before migration the service stops briefly and a consistent SQLite backup is
written under `shared/backups`. The deploy script applies `prisma migrate deploy`,
atomically switches `current`, restarts the service, and verifies the deployed
commit via `/api/health`. GitHub also checks the HTTPS domain and login redirects.
Deployments are serialized in GitHub and locked on EC2, without cancelling an
in-progress deployment. No database reset or destructive db-push is used.

The SQLite baseline matches the migration already applied on this server, including
its checksum. The second migration adds gate-staff and ticket-reissue schema while
preserving existing rows and lookup collations. Historical PostgreSQL migrations
are retained in `prisma/postgresql-migrations`; the active provider is SQLite.

## Recovery and subsequent changes

A failed migration before activation restores the stopped database backup and
previous code. A failed runtime health check restores previous code while retaining
the migrated database so new writes cannot be silently discarded. The included
migration is backward compatible with the previous app; future destructive schema
changes need an explicit compatible rollout/restore plan. Public-domain verification
failure is reported as a failed Actions run and requires inspection; it does not
blindly restore database data over a running app.

Before manually rolling back code, confirm schema compatibility and restore
`shared/previous-release` as `current`, then restart the service. Database backups
on the same EBS disk do not protect against disk/instance loss; no off-host backup
schedule is configured by this workflow. The deploy role cannot provision/terminate
instances or change security groups/DNS. Keep the public IP/DNS and SSH host key
current if replacing or stop/starting the host.

```sh
# Future deployment from this branch:
git push origin deploy-dev

# On the host:
sudo systemctl status e-tikket
sudo journalctl -u e-tikket -n 100 --no-pager
curl -fsS http://127.0.0.1:3100/api/health
```

OIDC reference: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
AWS OIDC provider API: https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateOpenIDConnectProvider.html

Verified OIDC subject: `repo:pitchakornofficial-prog@248051057/E-Tikket@1406759378:ref:refs/heads/deploy-dev`.
Subject-format reference: https://docs.github.com/en/actions/reference/security/oidc
