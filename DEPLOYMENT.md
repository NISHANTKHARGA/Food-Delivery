# Deploying Bitezy to AWS EC2 (CloudFormation + GitHub Actions over SSH)

This guide turns the repo into a live website on AWS:

- **CloudFormation** creates the VPC, security group, EC2 instance, Elastic IP, Node.js, and Nginx.
- **GitHub Actions** runs CI (lint + build) on every push and, on `main`/`master`, builds the
  storefront, builds the admin panel, copies the release to the server over **SSH**, and restarts
  the API.
- Nginx serves the storefront at `/`, the admin panel at `/admin/`, and proxies `/api` and
  `/images` to the Node API on `127.0.0.1:4000`.
- Uploaded food images live outside the releases and survive deployments.
- MongoDB Atlas is used, so no database runs on the instance.

```
GitHub Actions ──build──▶ release/ ──rsync/scp over SSH──▶ EC2
                                                          ├── Nginx :80  (/, /admin/, /api, /images)
                                                          └── Node  :4000 (Express + Mongoose)
                                                                  └── MongoDB Atlas
```

No AWS access keys are stored in GitHub. The pipeline only needs the EC2 host and an SSH key.

---

## 1. Push the project to your own GitHub repository

The local repo is still pointed at the original author's remote, so create your own empty repo
(GitHub → **New repository**), then:

```bash
cd D:\foooood\food-del
git remote remove origin
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

The workflow supports both `main` and `master`.

---

## 2. Create an EC2 key pair

EC2 console → **Key pairs** → **Create key pair**:

- Name: `bitezy-key`
- Type: **RSA**
- Format: **.pem**

Keep the downloaded `bitezy-key.pem` safe. You will paste its contents into GitHub and can use it
for `ssh -i bitezy-key.pem ec2-user@<elastic-ip>`.

---

## 3. Create the CloudFormation stack

### Option A - AWS console (easiest)

1. Open **CloudFormation** → **Create stack** → **With new resources (standard)**.
2. **Upload a template file** → select `infra/cloudformation/bitezy.yaml`.
3. Stack name: `bitezy`.
4. Parameters:

   | Parameter | Value |
   | --- | --- |
   | `ProjectName` | `bitezy` |
   | `InstanceType` | `t3.micro` (free-tier eligible; use `t3.small` for more headroom) |
   | `KeyName` | `bitezy-key` |
   | `AllowedSshCidr` | `0.0.0.0/0` (GitHub runners use dynamic IPs) |

5. Acknowledge the capability/creation prompts and **Create stack**.
6. Wait for `CREATE_COMPLETE` (about 2-4 minutes).

### Option B - AWS CLI

```bash
aws cloudformation deploy \
  --stack-name bitezy \
  --template-file infra/cloudformation/bitezy.yaml \
  --parameter-overrides \
      ProjectName=bitezy \
      InstanceType=t3.micro \
      KeyName=bitezy-key \
      AllowedSshCidr=0.0.0.0/0
```

### Get the public IP

CloudFormation → stack `bitezy` → **Outputs**:

- `WebsiteUrl` - storefront
- `AdminUrl` - admin panel
- `PublicIp` - the Elastic IP (needed by GitHub)
- `SshCommand` - ready-to-use SSH command

Until the first deployment finishes, the site shows a small "first deployment is on its way" page.

---

## 4. Configure GitHub

Repository → **Settings** → **Secrets and variables** → **Actions**.

### Variables (not secret)

| Name | Value |
| --- | --- |
| `EC2_HOST` | Elastic IP from the stack outputs, e.g. `54.123.45.67` |
| `EC2_USER` | `ec2-user` (Amazon Linux 2023 default) |
| `PUBLIC_ORIGIN` | optional - only when using a domain, e.g. `https://bitezy.example.com` |

### Secrets

| Name | Value |
| --- | --- |
| `EC2_SSH_KEY` | Full contents of `bitezy-key.pem`, including the BEGIN/END lines |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random string |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `ADMIN_EMAIL` | Admin login email, e.g. `admin@fooddel.local` |
| `ADMIN_PASSWORD` | Admin login password (at least 8 characters) |

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> The API refuses to start without `MONGODB_URI` and `JWT_SECRET`, so make sure both secrets are
> set before the first deploy. `config/db.js` currently contains the Atlas URI in code; the
> `MONGODB_URI` secret should point at the same database.

Optional: create a **production** environment under **Settings → Environments** and add
required reviewers if you want manual approval before each deploy. The workflow already targets
`environment: production`.

---

## 5. Deploy

Push to `main` (or run **Actions → CI/CD → Run workflow**):

```bash
git add .
git commit -m "Add EC2 deployment pipeline"
git push
```

The pipeline:

1. `verify` - installs, lints, and builds the storefront and admin panel.
2. `backend` - installs and syntax-checks the API.
3. `deploy` (push/manual only):
   - builds both React apps with `VITE_API_URL` pointing at your origin,
   - builds the admin bundle with base `/admin/`,
   - assembles a release,
   - writes the production `.env` from GitHub secrets,
   - rsyncs it to `/tmp/bitezy-<release>` on EC2,
   - runs `deploy/deploy.sh` (npm install, uploads symlink, static swap, restart),
   - smoke-tests `http://<EC2_HOST>/healthz`.

Open `WebsiteUrl` when the job is green. The admin panel is at `AdminUrl` and logs in with
`ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 6. Custom domain and HTTPS (optional)

1. Create a DNS `A` record pointing your domain at the Elastic IP.
2. GitHub → **Variables** → set `PUBLIC_ORIGIN` to `https://your-domain`.
3. Re-run the workflow.
4. SSH into the instance and issue a certificate:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain
```

Certbot edits `/etc/nginx/nginx.conf` and adds the HTTP→HTTPS redirect. Deploys do not overwrite
that file, so the certificate configuration stays in place. Port 443 is already open in the
security group.

If you skip this step, keep `PUBLIC_ORIGIN` empty and the pipeline uses `http://<Elastic IP>`.

---

## 7. Day-to-day operations

| Task | Command |
| --- | --- |
| API logs | `sudo journalctl -u bitezy-api -f` |
| Nginx logs | `sudo tail -f /var/log/nginx/error.log` |
| Bootstrap log (first boot) | `sudo less /var/log/bitezy-bootstrap.log` |
| Restart API | `sudo systemctl restart bitezy-api` |
| Restart Nginx | `sudo systemctl reload nginx` |
| Health check | `curl http://127.0.0.1/healthz` |
| List releases | `ls -1dt /opt/bitezy/releases/*` |
| Review env | `sudo cat /opt/bitezy/shared/.env` |

### Update secrets

Update the GitHub secret, then re-run the workflow - `.env` is regenerated on every deploy. For a
quick change without a deploy:

```bash
sudo nano /opt/bitezy/shared/.env
sudo systemctl restart bitezy-api
```

Remember to update the GitHub secret too, otherwise the next deploy overwrites it.

### Roll back

```bash
ls -1dt /opt/bitezy/releases/*
sudo ln -sfn /opt/bitezy/releases/<release-id> /opt/bitezy/current
sudo cp -a /opt/bitezy/releases/<release-id>/frontend/. /var/www/bitezy/frontend/
sudo cp -a /opt/bitezy/releases/<release-id>/admin/. /var/www/bitezy/admin/
sudo systemctl restart bitezy-api
```

The five most recent releases are kept automatically.

### Uploaded images

User uploads go to `/opt/bitezy/shared/uploads` and are linked into every release. They survive
deploys but live on the instance's EBS volume - enable EBS snapshots if they matter. The sample
image shipped with the repo is copied in automatically when missing.

---

## 8. Cost

- `t3.micro`: free-tier eligible for 12 months, otherwise roughly US$8-10/month.
- 20 GB gp3 EBS: about US$1.60/month.
- Elastic IP: free while attached to a running instance.
- Data transfer: negligible for a demo.

Switch `InstanceType` to `t3.small` if you see memory pressure. Builds run on GitHub, so the
server only runs Nginx and Node.

---

## 9. Security notes

- SSH is key-only on Amazon Linux 2023; password logins are disabled by default.
- `AllowedSshCidr` defaults to `0.0.0.0/0` because GitHub-hosted runner IPs change. Narrow it if
  you use self-hosted runners or deploy from a fixed IP. Alternatively, use a bastion or SSM
  Session Manager later.
- The pipeline never stores AWS credentials - deployment is plain SSH.
- The Atlas credentials are currently hardcoded in `Backend/config/db.js`. Rotate that database
  user and move the URI into the `MONGODB_URI` secret (and remove the hardcoded value) before
  making the repository public.
- Stripe is configured for **NPR**; use test keys until you are ready to go live.
- Migrate to HTTPS before handling real customer data.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Missing GitHub configuration` | variable/secret not set | Add all names from section 4 |
| `Permission denied (publickey)` | wrong key or user | Re-paste the `.pem` into `EC2_SSH_KEY`, check `EC2_USER=ec2-user` |
| `Host key verification failed` | stale `known_hosts` on the runner | Re-run; the workflow scans the host each time |
| 502 from `/api` or `/healthz` | API not running | `sudo journalctl -u bitezy-api -n 100` and check `.env` |
| Blank page / CORS error | origin mismatch | Set `PUBLIC_ORIGIN` to the exact `https://` origin and redeploy |
| Images return 404 | uploads missing | Check `/opt/bitezy/shared/uploads` and `/var/log/nginx/error.log` |
| `npm ci` fails on the server | dependency/lockfile drift | Commit `package-lock.json`; deploy again |
| Admin page 404 on refresh | admin not built with `/admin/` base | Ensure the build uses `--base=/admin/` (the workflow does) |
| Stack rollback on create | key pair name wrong or unsupported instance type | Fix the parameter and recreate |

Check CloudFormation **Events** first if the instance never appears, and
`/var/log/bitezy-bootstrap.log` on the server if Nginx or systemd is missing.
