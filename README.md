# Murti Inventory — Complete Mobile-First Web App

Web-only project. The repository root is the Vite app, so Vercel should use **Root Directory = `.`**.

## Features
- Mobile-first app-like responsive UI; desktop sidebar and mobile bottom navigation
- Firebase Firestore real-time inventory
- Search by **Murti Number OR Name**; Name is optional
- Duplicate Murti Numbers are explicitly allowed
- Search results show only matches, with **large/bold Number and Location**
- Add, edit and delete records
- Location-wise counts
- Duplicate-number count
- Clear all data with confirmation
- Firebase Email/Password login UI
- Photo UI placeholder; Firebase Storage is not used because this Firebase project is currently on Spark plan

## Run frontend
```bash
npm install
npm run dev
```
Open the Vite URL, normally `http://localhost:5173/`.

## Build
```bash
npm run build
npm run preview
```

## Node.js backend
The `server/` folder is included for the production API layer. It uses Firebase Admin and requires service-account environment variables. Do not put private keys in GitHub.

```bash
cd server
npm install
copy .env.example .env
npm start
```

## Vercel
Import the GitHub repository. Keep **Root Directory = `.`**. Build command is `npm run build`; output directory is `dist`.
