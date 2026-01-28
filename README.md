# 📡 SwitchRadar

**SwitchRadar** is a premium, high-performance business intelligence platform designed for visual market analysis and optimized visit planning. Built with React and powered by a Node.js backend, it transforms raw spreadsheets into actionable geospatial intelligence.

## 🚀 Key Features

- **📍 Intelligent Mapping**: High-performance Leaflet integration optimized for 2000+ businesses using canvas rendering and clustered markers.
- **🗺️ Interactive Detail Sidebar**: Seamless sidebar integration for business details, removing intrusive map popups.
- **🚗 Route Planner**: Build and manage optimized visit routes with one-click export to Google Maps.
- **📊 Intelligence Dashboard**: Real-time market analytics including network distribution, town penetration, and category trends.
- **☁️ Cloud Sync & Auth**: Secure Node.js/SQLite backend for persistence across devices and team collaboration.
- **⚡ Performance First**: Local-first architecture (IndexedDB) with background cloud synchronization for a lag-free experience.
- **� Phone Identification**: Visual indicators for Landline vs. Mobile numbers based on network provider intelligence.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Database**: IndexedDB (Frontend via Dexie), SQLite (Backend)
- **Backend**: Node.js, Express, JWT Auth
- **Mapping**: Leaflet, MarkerCluster (Canvas-optimized)
- **Analytics**: Recharts (Customized Area, Pie, and Bar charts)

## 🎯 Architecture

The app uses a **Local-First Sync** pattern:
1. Data is primarily managed in the browser's **IndexedDB** for instant updates.
2. A debounced **Cloud Sync** hook pushes changes to the SQLite backend.
3. On login, data is automatically hydrated from the cloud to ensure consistency across devices.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Stack**:
   ```bash
   npm run dev
   ```
   *Note: This starts both the Vite frontend and the Node.js server (configured via proxy).*

## 🐳 Deployment (Dokploy / VPS)

SwitchRadar is dockerized for easy deployment. It uses a multi-process Dockerfile running Nginx (for the frontend) and Node.js (for the backend) simultaneously.

```bash
docker build -t switchradar .
docker run -p 80:80 switchradar
```

*See [DOKPLOY.md](./DOKPLOY.md) for detailed deployment walkthroughs.*

## 📂 Folder Structure

- `src/hooks`: Custom React hooks for business logic and synchronization.
- `src/components`: Modular UI components.
- `src/utils`: Data processing and provider coloring logic.
- `server/`: Node.js backend with SQLite integration.
- `src/db/`: Dexie database schema and migrations.

## 📄 License

MIT Copyright (c) 2026 Blake The Builder.
