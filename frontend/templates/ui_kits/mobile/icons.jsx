/* eslint-disable */
// Inline Lucide-style SVG icons.
// Stroke 1.8, currentColor — matches the production lucide-react setup.

const sw = 1.8;

function svg(children, props = {}) {
  const { size = 16, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

const Icon = {
  Truck: (p) => svg(<><path d="M3 17h13M3 17V8a2 2 0 012-2h8v11M16 17h2.5a1.5 1.5 0 001.5-1.5V11l-3-3h-1"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></>, p),
  Home: (p) => svg(<><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></>, p),
  Layers: (p) => svg(<><polygon points="12 2 22 8 12 14 2 8 12 2"/><polyline points="2 16 12 22 22 16"/><polyline points="2 12 12 18 22 12"/></>, p),
  Users: (p) => svg(<><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, p),
  Map: (p) => svg(<><polygon points="3 6 9 4 15 6 21 4 21 18 15 20 9 18 3 20 3 6"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/></>, p),
  Tag: (p) => svg(<><path d="M20.59 13.41L13.42 20.59a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.2"/></>, p),
  Receipt: (p) => svg(<><path d="M4 4h16v18l-3-2-3 2-3-2-3 2-4-2V4z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></>, p),
  Activity: (p) => svg(<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>, p),
  Settings: (p) => svg(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c0 .69.4 1.31 1 1.6"/></>, p),
  LogOut: (p) => svg(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>, p),
  Plus: (p) => svg(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, p),
  Search: (p) => svg(<><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></>, p),
  ChevronRight: (p) => svg(<polyline points="9 18 15 12 9 6"/>, p),
  ChevronLeft: (p) => svg(<polyline points="15 18 9 12 15 6"/>, p),
  ChevronDown: (p) => svg(<polyline points="6 9 12 15 18 9"/>, p),
  ArrowUpRight: (p) => svg(<><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>, p),
  TrendingUp: (p) => svg(<><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></>, p),
  TrendingDown: (p) => svg(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>, p),
  Lock: (p) => svg(<><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>, p),
  User: (p) => svg(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>, p),
  Eye: (p) => svg(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>, p),
  AlertCircle: (p) => svg(<><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>, p),
  Calendar: (p) => svg(<><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></>, p),
  Dollar: (p) => svg(<><line x1="12" y1="3" x2="12" y2="21"/><path d="M16 7H10a3 3 0 100 6h4a3 3 0 110 6H7"/></>, p),
  CheckCircle: (p) => svg(<><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5L16 9.5"/></>, p),
  Package: (p) => svg(<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>, p),
  Filter: (p) => svg(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>, p),
  Download: (p) => svg(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>, p),
  Bell: (p) => svg(<><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>, p),
  Phone: (p) => svg(<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.93.36 1.85.7 2.73a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.35-1.35a2 2 0 012.11-.45c.88.34 1.8.57 2.73.7A2 2 0 0122 16.92z"/>, p),
};

Object.assign(window, { Icon });
