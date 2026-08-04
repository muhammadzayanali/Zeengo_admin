# ZEENGO Operations Dashboard

React + TypeScript + Vite feature-based Ops UI consuming the NestJS API.

## Stack

- React 19 · Vite · Tailwind CSS v4
- TanStack Query · React Hook Form · Zod · React Router
- Socket-ready API client (axios)

## Run

```bash
# API must be running on :3000
cd ../backend/zeengo_backend && npm run start:dev

cd ../../frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

Login: `ops@zeengo.com` / `password123`

## Features

- `/ops` Dashboard — KPIs, today, queue preview, unassigned pool
- `/ops/bookings` — search, filter, sort, paginate, create, soft-delete
- `/ops/bookings/:id` — program + assignments + status update
- `/ops/boards` — booking kanban + driver board
- `/ops/queue` — ops queue manage / resolve
- `/ops/dispatch` — assignments + create dispatch
- `/ops/finance` — rollup + payments ledger

All pages include loading skeletons, empty states, error states, toasts, confirmation dialogs, role-based UI, and dark-mode theme toggle.
