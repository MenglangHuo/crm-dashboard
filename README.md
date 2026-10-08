# CRM Dashboard

Modern, full-featured Customer Relationship Management (CRM) web dashboard built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS**, and **TanStack Query**. It integrates seamlessly with the Spring Boot 3 enterprise CRM backend.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Local Run](#installation--local-run)
- [Environment Variables](#-environment-variables)
- [Deployment on Vercel](#-deployment-on-vercel)
- [Troubleshooting: Vercel 404 API Error](#-troubleshooting-vercel-404-api-error)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)


---

## 🏗️ Overview & Architecture

The CRM frontend is designed as a secure, high-performance single-page/server-rendered hybrid application:

```
[Browser / Client]
       │
       │ (1) Same-origin requests to /api/v1/*
       ▼
[Next.js Server / Vercel Edge Router]
       │
       │ (2) Server-side rewrites (next.config.mjs)
       │     NEXT_PUBLIC_API_BACKEND_URL
       ▼
[Spring Boot Backend API] (e.g., https://crmapi.bronxtechnology.site)
```

### Why Same-Origin Reverse Proxy?
- **CORS Protection**: The browser only communicates with the same origin (`/api/v1/*`), preventing browser CORS errors and strict-origin issues.
- **Secure Token & Cookie Handling**: Authentication cookies (`rumluos_access_token`, `rumluos_refresh_token`) work smoothly with `SameSite=Lax` without cross-site cookie blocking.
- **Clean API Abstraction**: Frontend code interacts with standard relative endpoints while Next.js handles routing to the target backend.

---

## ✨ Key Features

- **Authentication & RBAC**:
  - JWT token-based authentication with RS512 cryptographic verification.
  - Automatic silent refresh token rotation via Axios interceptors.
  - Multi-tenant role-based access control (Super Admin, Company Admin, Staff).
- **Customer & Organization Management**:
  - Customer 360 view with transaction histories, orders, and credit tracking.
  - Spatial mapping and nearby customer lookup via PostGIS integration.
  - Multi-branch and administrative division hierarchy.
- **Product Catalog & Inventory**:
  - Multi-variant product builder with multi-tier unit pricing.
  - Real-time stock movements, stock adjustments, and warehouse tracking.
- **Orders, Invoices & Payments**:
  - Complete order lifecycle (Draft → Confirmed → In Delivery → Delivered).
  - Automated invoice generation, partial payments, and multi-invoice reconciliation.
- **Analytics & Reporting**:
  - Interactive dashboards using ApexCharts.
  - Revenue, profit/loss, and inventory valuation time-series charts.
- **Push Notifications**:
  - Real-time web push notifications powered by OneSignal.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS 4, tw-animate-css |
| **Components** | Radix UI / Base UI / shadcn/ui, Lucide Icons |
| **State & Data Fetching** | TanStack React Query v5, Axios |
| **Forms & Validation** | React Hook Form, Zod |
| **Charts** | ApexCharts, React-ApexCharts |
| **Notifications** | Sonner (Toasts), OneSignal (Push Notifications) |
| **Package Manager** | pnpm 11 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later (Node.js 22 LTS recommended)
- **pnpm**: `v10.x` or `v11.x` (`npm install -g pnpm`)
- Running Spring Boot Backend API (either local `http://localhost:8091` or remote `https://crmapi.bronxtechnology.site`)

### Installation & Local Run

1. **Clone the repository and navigate to `crm-dashboard`**:
   ```bash
   cd crm-dashboard
   ```

2. **Set up Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```
   The application will start on **`http://localhost:4000`**.

5. **Build for production**:
   ```bash
   pnpm build
   pnpm start
   ```

---

## ⚙️ Environment Variables

Create a `.env` file in the `crm-dashboard` root directory:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BACKEND_URL` | **Yes** | `http://localhost:8091` | The target Spring Boot API server URL used by Next.js rewrites and server proxy. **Set to `https://crmapi.bronxtechnology.site` in production.** |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | `/api/v1` | Relative base path for browser API client calls (same-origin). |
| `NEXT_PUBLIC_API_TIMEOUT` | No | `15000` | Axios HTTP timeout in milliseconds. |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | No | - | App ID for OneSignal push notification integration. |
| `NEXT_PUBLIC_COMPANY_NAME` | No | `Crm` | Company display name in the navigation header. |
| `NEXT_PUBLIC_COMPANY_TAGLINE` | No | - | Subtitle tagline on authentication pages. |
| `NEXT_PUBLIC_COMPANY_LOGO_URL` | No | `/icon.svg` | Path or URL to company logo icon. |
| `NEXT_PUBLIC_LOGIN_IMAGE_URL` | No | `/bg-blossom.png` | Background illustration displayed on the login page. |
| `NEXT_PUBLIC_COMPANY_PRIMARY_COLOR` | No | `#1d232a` | Brand primary theme color. |
| `NEXT_PUBLIC_COMPANY_ACCENT_COLOR` | No | `#5f8d6b` | Brand accent color. |
| `NEXT_PUBLIC_COMPANY_SUPPORT_EMAIL` | No | `support@crm.com` | Support contact email displayed in help links. |

---

## 🚢 Deployment on Vercel

When deploying `crm-dashboard` to Vercel:

1. **Import the repository into Vercel**:
   - If deploying from a monorepo (`crm-app`), set the **Root Directory** in Vercel to `crm-dashboard`.
   - If deploying from the standalone `crm-dashboard` repository, leave Root Directory as `./`.
2. **Framework Preset**: Select **Next.js**.
3. **Build Command**: `pnpm build` (or leave default `next build`).
4. **Environment Variables**:
   Add the following variables in the Vercel project settings:
   - `NEXT_PUBLIC_API_BACKEND_URL`: `https://crmapi.bronxtechnology.site`
   - `NEXT_PUBLIC_API_BASE_URL`: `/api/v1`
   - `NEXT_PUBLIC_API_TIMEOUT`: `15000`
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID`: `your_onesignal_app_id`

---

## 🚨 Troubleshooting: Vercel 404 API Error

### Symptom
When accessing the deployed site on Vercel and performing actions (like logging in or fetching customer/product data), all API calls fail with:
```json
error: {
  code: "404",
  message: "The page could not be found"
}
```
However, running locally (`pnpm dev`) works normally without errors.

---

### Root Cause Analysis

1. **`.env` is ignored by Git**:
   - The `.env` file is excluded from git commits by `.gitignore`.
   - Vercel does **not** have your local `.env` file. It solely relies on the Environment Variables configured in the Vercel Dashboard.

2. **Missing `NEXT_PUBLIC_API_BACKEND_URL` on Vercel**:
   - Next.js rewrites proxy `/api/v1/*` calls to the backend. Without `NEXT_PUBLIC_API_BACKEND_URL` in Vercel settings, it falls back to `http://localhost:8091`.
   - In Vercel's cloud environment, `localhost:8091` does not exist, causing Vercel's Edge Router to return `404: The page could not be found`.

3. **App Router Route Precedence (Filesystem Shadowing)**:
   - In Next.js App Router, if the `app/api/v1/` folder exists with specific route handlers, Next.js checks the filesystem first.
   - Any subpath without an explicit `route.ts` file (e.g. `/api/v1/auth/login`, `/api/v1/customers`, etc.) was intercepted by the App Router and returned a 404 before reaching rewrites.
   - **Solution implemented**: We added a catch-all route handler (`app/api/v1/[...path]/route.ts`) and configured rewrites across `beforeFiles`, `afterFiles`, and `fallback`.

4. **Direct Endpoint Misconfiguration in Client**:
   - If `NEXT_PUBLIC_API_ENPOINT` was configured to `localhost:8091` or backend directly, the client attempted direct cross-origin calls.
   - **Solution implemented**: `lib/api/client.ts` now enforces same-origin relative URLs (`/api/v1`) in the browser.

---

### Step-by-Step Fix

#### Step 1: Commit and Push the Code to GitHub
Ensure all new route handlers and configurations are pushed to your remote repository:
```bash
git add .
git commit -m "fix(api): add catch-all route handlers and robust backend proxying"
git push origin main
```

#### Step 2: Configure Environment Variables in Vercel
1. Open your project on the [Vercel Dashboard](https://vercel.com).
2. Go to **Settings** → **Environment Variables**.
3. Add the following keys (check **Production**, **Preview**, **Development**):
   - **Key**: `NEXT_PUBLIC_API_BACKEND_URL`  
     **Value**: `https://crmapi.bronxtechnology.site`  
     *(Do NOT include trailing slash `/` or suffix `/api/v1`)*
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`  
     **Value**: `/api/v1`
   - **Key**: `NEXT_PUBLIC_API_TIMEOUT`  
     **Value**: `15000`
4. If you had `NEXT_PUBLIC_API_ENPOINT` set to `localhost:8091`, **delete or update it**.
5. Click **Save**.

#### Step 3: Trigger a Clean Redeploy (Crucial!)
Because Next.js compiles `next.config.mjs` rewrites during the build phase:
1. In Vercel, go to the **Deployments** tab.
2. Find your latest deployment, click the **three dots (`...`)** on the right side.
3. Select **Redeploy**.
4. **Uncheck** "Use existing Build Cache" (or leave it unchecked) and click **Redeploy**.
5. Wait for the build to finish.

#### Step 3: Verify the Fix
1. Open the newly deployed Vercel URL in your browser.
2. Open browser Developer Tools (**F12** → **Network** tab).
3. Try signing in or browsing pages.
4. Requests to `/api/v1/...` should now return HTTP `200` responses forwarded from `https://crmapi.bronxtechnology.site`.

---

### Common Pitfalls to Avoid

| Pitfall | Problem | Solution |
|---|---|---|
| Trailing slash in backend URL | Setting `https://crmapi.bronxtechnology.site/` creates `https://crmapi.bronxtechnology.site//api/v1` (double slashes). | Use `https://crmapi.bronxtechnology.site` without a trailing slash. *(Handled automatically by the updated `next.config.mjs`)* |
| Adding `/api/v1` to backend URL | Setting `https://crmapi.bronxtechnology.site/api/v1` results in `/api/v1/api/v1/*`. | Set only the base origin: `https://crmapi.bronxtechnology.site`. |
| Missing Redeploy after adding Env Var | Adding the variable in Vercel settings without redeploying leaves the old build active. | Always trigger a **Redeploy** after updating Environment Variables in Vercel. |
| Backend CORS restrictions | Calling the backend directly from browser instead of via `/api/v1` proxy triggers CORS rejections. | Ensure `NEXT_PUBLIC_API_BASE_URL=/api/v1` so the proxy handles all traffic. |

---

## 📂 Project Structure

```
crm-dashboard/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Authentication routes (sign-in, forgot-password, etc.)
│   ├── (dashboard)/            # Dashboard layout and feature views
│   │   ├── customers/          # Customer profiles, contacts, PostGIS map
│   │   ├── products/           # Product catalog, unit pricing, variants
│   │   ├── inventory/          # Stock movements, imports, warehouses
│   │   ├── orders/             # Sales orders management
│   │   ├── invoices/           # Invoicing, refunds, discounts
│   │   ├── payments/           # Payment reconciliation
│   │   ├── branches/           # Company branches & locations
│   │   ├── audit-logs/         # System audit trails
│   │   └── super-admin/        # Tenant configurations, plans, migrations
│   ├── actions/                # Server Actions (cookies, auth sessions)
│   ├── api/                    # Server Route Handlers
│   │   ├── auth/refresh-token/ # Refresh token route handler
│   │   └── v1/                 # Proxy handlers for specific endpoints
│   ├── layout.tsx              # Root HTML & Providers layout
│   └── page.tsx                # Dashboard root page
├── components/                 # Reusable UI components
│   ├── ui/                     # Base design system components (buttons, dialogs, tables)
│   ├── sidebar/                # Main application navigation sidebar
│   ├── forms/                  # Form builders and input controls
│   └── providers/              # TanStack Query, Theme, and Notification providers
├── hooks/                      # Custom React hooks (auth, debounce, media queries)
├── lib/                        # Core utilities and business logic
│   ├── api/
│   │   ├── client.ts           # Axios instance with token interceptors
│   │   └── endpoints.ts        # Strongly-typed API queries & mutations
│   ├── server/                 # Server-side proxy and token decoding
│   ├── product-unit-pricing.ts # Price conversion and discount calculation
│   └── types.ts                # TypeScript domain models and API contracts
├── public/                     # Static assets (logos, illustrations, icons)
├── next.config.mjs             # Next.js config with dynamic backend rewrites
├── proxy.ts                    # Route protection proxy / middleware logic
├── package.json                # Project dependencies and npm scripts
└── tsconfig.json               # TypeScript configuration
```

---

## 📜 Available Scripts

In the project directory, you can run:

- `pnpm dev`: Runs the app in development mode on `http://localhost:4000`.
- `pnpm build`: Builds the production bundle.
- `pnpm start`: Starts the Next.js production server.
- `pnpm lint`: Runs ESLint to check for code style and syntax issues.

---

## 📄 License

Internal proprietary software. All rights reserved by Bronx Technology 
