# Vận tải hàng hóa - Frontend

React + TypeScript + Vite + Tailwind CSS frontend.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Runs at http://localhost:5173

## Tech Stack

- **React 18** + TypeScript
- **Vite** build tool
- **Tailwind CSS** + custom design system
- **shadcn/ui** component patterns (Radix UI)
- **React Router** v6
- **TanStack Query** for data fetching
- **React Hook Form** + Zod validation
- **Axios** HTTP client
- **Lucide** icons
- **Sonner** toasts

## Design System

Matches payroll-frontend theme:
- Navy & Gold premium palette
- Responsive: desktop sidebar + mobile bottom nav
- Vietnamese UI text

## Project Structure

```
frontend/src/
├── components/
│   ├── ui/          # shadcn-style primitives
│   ├── layout/      # Sidebar, header, bottom nav
│   └── shared/      # Reusable business components
├── pages/           # Route pages
│   └── mobile/      # Mobile-specific views
├── hooks/           # Custom React hooks
├── services/api/    # API client & service modules
├── lib/             # Utility functions
├── contexts/        # React contexts (auth, theme)
├── types/           # TypeScript type definitions
└── styles/          # Additional styles
```
