<div align="center">

<img src="Frontend/src/assets/logo.svg" alt="Bitezy logo" width="300" />

# Bitezy — Food Delivery Platform

A full-stack food delivery application with a React storefront, a React admin panel, and an Express + MongoDB REST API. Browse the menu, manage a cart, and check out with Stripe (amounts are in NPR); admins manage food items and orders behind JWT authentication.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

</div>

![Bitezy storefront banner](Frontend/public/header_img.jpg)

## Live deployment

Hosted on Vercel:

- **Storefront:** https://food-delivery-snowy-psi.vercel.app/
- **Admin panel:** https://food-delivery-snowy-psi.vercel.app/admin/

## Features

**Storefront**
- Browse and search food items by category
- Add/remove items from a cart with delivery charges and totals
- User registration/login with JWT-based sessions
- Stripe test checkout with server-side price verification and order confirmation
- View order history and live order status

**Admin panel**
- JWT-protected admin login
- Add and remove food items with image uploads
- View all customer orders and update delivery status
- Served from `/admin/` in production

**Backend**
- Express 5 REST API with MongoDB Atlas persistence
- Hashed passwords, JWT authentication, role checks, rate limiting, Helmet, and restrictive CORS
- Server-side pricing in NPR (conversion rate `128`) so client-side values are never trusted
- Static image serving from `Backend/uploads/`

**CI/CD**
- GitHub Actions pipeline (`.github/workflows/deploy.yml`) with build → test → deploy stages
- Deploys to AWS EC2 over SSH; secrets keep credentials out of the repository

## Tech stack

| Layer | Technology |
| --- | --- |
| Storefront | React 19, React Router 7, Axios, Vite 8 |
| Admin | React 19, React Router 7, React Toastify, Vite 8 |
| API | Node.js 20+, Express 5, Mongoose 9, JWT, bcrypt, Multer, Stripe |
| Database | MongoDB Atlas |
| Deployment | GitHub Actions, AWS EC2, PM2, Nginx |

## Repository layout

```
food-delivery/
├── Frontend/   # Customer storefront (Vite + React)
├── Admin/      # Admin panel (Vite + React), base path /admin/
├── Backend/    # Express REST API, MongoDB models, Stripe checkout, uploads
└── .github/
    └── workflows/deploy.yml   # Build → test → SSH deploy to EC2
```

## Screenshots

<table>
  <tr>
    <td align="center"><img src="Frontend/src/assets/food_1.png" alt="Food item 1" width="220" /></td>
    <td align="center"><img src="Frontend/src/assets/food_2.png" alt="Food item 2" width="220" /></td>
    <td align="center"><img src="Frontend/src/assets/food_3.png" alt="Food item 3" width="220" /></td>
    <td align="center"><img src="Frontend/src/assets/food_4.png" alt="Food item 4" width="220" /></td>
  </tr>
</table>

## Getting started

Prerequisites: **Node.js >= 20.19**, npm, a MongoDB Atlas cluster, and a Stripe test secret key.

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
# fill in MONGODB_URI, JWT_SECRET, STRIPE_SECRET_KEY and admin credentials
npm run server            # starts on http://localhost:4000 with nodemon
```

### 2. Storefront

```bash
cd Frontend
npm install
cp .env.example .env      # VITE_API_URL defaults to http://localhost:4000
npm run dev               # http://localhost:5173
```

### 3. Admin panel

```bash
cd Admin
npm install
cp .env.example .env
npm run dev               # http://localhost:5174
```

Use `npm run build` in `Frontend/` and `Admin/` to produce production bundles in their `dist/` folders. The admin build is configured with `base: '/admin/'` and a matching router `basename`, so it can be hosted under `/admin/`. The backend can be started in production with `npm start`.

> Never commit `.env` files or uploaded images. Use the `.env.example` files as templates; `Backend/uploads/` is gitignored.

### Starter menu

A small starter catalog is included so a fresh database is not empty:

```bash
cd Backend
node scripts/seed-menu.js
```

This upserts ten items by name into MongoDB. Their images live in the tracked `Backend/seed-images/` folder; the deployment workflow copies them into `Backend/uploads/` on the server so the API can serve them from `/images/<filename>`.

## Environment variables

**Backend (`Backend/.env`)**

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL`, `CORS_ORIGINS` | Allowed browser origins |
| `TRUST_PROXY` | Trust `X-Forwarded-*` headers behind Nginx |
| `MONGODB_URI` | MongoDB Atlas connection string (local or `mongodb+srv://...`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | User token signing and lifetime |
| `STRIPE_SECRET_KEY` | Stripe test secret key |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_JWT_EXPIRES_IN` | Admin account and token lifetime |

**Frontend / Admin (`.env`)**

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend, e.g. `http://localhost:4000` |

## API overview

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Health check (`API Working`) |
| `GET` | `/api/food/list` | Public | List food items |
| `POST` | `/api/food/add` | Admin | Add an item (multipart image upload) |
| `POST` | `/api/food/remove` | Admin | Remove an item |
| `POST` | `/api/user/register`, `/api/user/login` | Public | User auth |
| `POST` | `/api/user/admin/login` | Public | Admin auth |
| `POST` | `/api/cart/add`, `/api/cart/remove`, `/api/cart/get` | User | Cart operations |
| `POST` | `/api/order/place`, `/api/order/verify` | User | Stripe checkout and verification |
| `POST` | `/api/order/userorders` | User | Current user's orders |
| `GET` | `/api/order/list` | Admin | All orders |
| `POST` | `/api/order/status` | Admin | Update order status |
| `GET` | `/images/<filename>` | Public | Uploaded food images |

## Deployment

### Vercel

`vercel.json` builds the storefront into `dist/`, the admin panel into `dist/admin/`, and the starter images into `dist/images/`. The Express API runs as the catch-all serverless function `api/[...path].js`; on Vercel, uploads use `/tmp/uploads` because the filesystem is read-only elsewhere. Set `VITE_API_URL=/` so the browser calls the API on the same origin, and configure the backend secrets (`MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, admin credentials, etc.) as Vercel environment variables. Deploy with `vercel --prod`.

### AWS EC2 (GitHub Actions)

The `food delivery` GitHub Actions workflow runs on pushes to `main` or `master` and can also be started manually. It builds the storefront and admin, runs available tests, then SSHes into the EC2 instance at `/var/www/food-delivery/Food-Delivery`, pulls the branch, installs dependencies, restarts PM2, and rebuilds both frontends. A final step prints the deployed URLs.

Configure these repository **Secrets**:

| Secret | Value |
| --- | --- |
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | SSH user (for example `ec2-user`) |
| `EC2_SSH_KEY` | Base64-encoded private SSH key |

The server checkout must have a clean working tree, the correct branch, and a PM2-managed backend process. Note that `Backend/uploads/` is gitignored, so uploaded images must be copied to the server separately when moving a database that references them.
