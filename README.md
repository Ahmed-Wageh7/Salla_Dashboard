# Salla Dashboard

A production-style Angular 21 admin dashboard for managing an e-commerce business. The project is built as a Salla-inspired control panel with modern Angular patterns, resilient API handling, permission-aware navigation, audit logging, and full CRUD workflows for core business domains.

## Overview

This dashboard is designed to simulate a real-world admin platform rather than a simple CRUD demo. It includes:

- authentication with guards and HTTP interceptors
- route-level and navigation-level RBAC
- action-level permission-aware controls
- audit logging for important admin operations
- resilient API error handling with retry and normalized messages
- products, categories, and subcategories management
- orders management with filtering, status updates, export, and local fallback flows
- staff management including attendance, deductions, and salary workflows
- Angular standalone components, signals, and `OnPush` change detection

## Tech Stack

- Angular 21
- TypeScript 5
- Angular Signals
- Angular Standalone Components
- SCSS
- RxJS
- Vite/Vitest via Angular test tooling
- Font Awesome

## Key Features

### Authentication and Access Control

- login flow backed by API token handling
- auth guard and guest-only guard
- HTTP interceptor for auth/session expiry handling
- role and permission model with protected routes
- permission-aware sidebar and restricted actions inside pages

### Dashboard

- KPI cards and growth summaries
- recent orders preview
- business widgets and operational overview
- fallback-friendly data shaping for unstable backend payloads

### Catalog Management

- products list with search, sorting, pagination, and editing
- create, update, and delete product flows
- stock update workflow
- categories CRUD
- subcategories CRUD
- catalog detail views

### Orders

- orders listing with status tabs and filters
- order detail page
- create order workflow
- order status changes
- local fallback storage for certain order creation scenarios
- JSON export

### Staff Workspace

- staff list and detail pages
- create, update, and delete staff records
- attendance check-in / check-out actions
- deductions management per staff member
- salary review, adjustment, and pay actions

### Reliability and Observability

- resilient API interceptor with retry for transient failures
- normalized API/network error messaging
- audit log page with filters, date range, pagination, metadata view, and export

## Project Structure

```text
src/
  app/
    components/        # reusable layout/header/sidebar components
    core/
      auth/            # auth services, guards, access control
      http/            # HTTP resilience/interceptors
      api/             # backend API service and models
    data/              # local mock/demo data
    layout/            # application shell
    pages/
      dashboard/
      products/
      orders/
      staff/
      audit-logs/
      forbidden/
      login/
    services/          # cross-feature services like dashboard and audit logs
    shared/            # shared toast and access directives
```

## Getting Started

### Prerequisites

- Node.js 20.x
- npm 10+

### Install

```bash
npm ci
```

### Run locally

```bash
npm start
```

The app runs at:

```text
http://localhost:4200
```

## Available Scripts

- `npm start`  
  Starts the Angular dev server.

- `npm run build`  
  Builds the static production bundle with a relative base href.

- `npm run build:vercel`  
  Builds the app for Vercel deployment with a root base href.

- `npm run test:ci`  
  Runs the test suite once in CI mode.

## Environment

The frontend currently targets this backend API:

```ts
https://3ssaf-back-end-rchu.vercel.app/api/v1
```

You can update it in:

[`src/environments/environment.ts`](src/environments/environment.ts)

## Deployment on Vercel

This repository is prepared for static deployment on Vercel.

### What is already configured

- `vercel.json` defines:
  - install command: `npm ci`
  - build command: `npm run build:vercel`
  - output directory: `dist/salla-dashboard/browser`
- `package.json` includes a dedicated `build:vercel` script
- Node engine is pinned to `20.x`
- the app uses hash-based routing, which works well on static hosting

### Deploy steps

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Vercel will detect `vercel.json` and use the provided build settings.
4. Deploy.

### Important note

The app is configured for static hosting. The Angular SSR server files in `src/server.ts` and `src/main.server.ts` remain in the repo, but the Vercel setup here deploys the static browser build, which is the simplest and most reliable fit for the current app.

## Quality Checks

Run tests:

```bash
npm run test:ci
```

Build locally:

```bash
npm run build:vercel
```

## Why This Project Stands Out

This project goes beyond basic admin CRUD by including:

- permission-aware UX
- audit logging
- resilient API handling
- operational staff workflows
- modular Angular architecture with standalone components and signals
