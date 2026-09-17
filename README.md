# MOAE Inventory Management System

A role-based inventory management system for coordinating stock across a central warehouse and retail stores. It supports product variants, incoming shipment batches, store stock requests, dispatch and receipt confirmation, sales recording, reports, and an activity audit log.

## Technology

- Client: React, Vite, Axios, Recharts
- Server: Node.js, Express, Sequelize
- Database: MySQL

## Roles

- Administrator: users, locations, activity logs, and system-wide reports
- Warehouse manager: products, incoming shipments, and store-request dispatch
- Store manager: local inventory, stock requests, receipt confirmation, and sales

## Local setup

1. Create a MySQL database by running `server/schema.sql`.
2. Copy `server/.env.example` to `server/.env` and add your database credentials and administrator credentials.
3. Copy `client/.env.example` to `client/.env.local` if the API is not running at the default local address.
4. Run `npm install` in both `server` and `client`.
5. Run `npm run dev` in `server`, then `npm run dev` in `client`.
6. Run `node src/seed/createAdmin.js` in `server` once to create the first administrator.

## Validation

From `client`, run:

```text
npm run lint
npm run build
```

The production build currently succeeds. The build tool reports a bundle-size warning; route-based code splitting is the next performance improvement.
