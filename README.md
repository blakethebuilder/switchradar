# 📡 SwitchRadar

**SwitchRadar** is a premium, high-performance lead intelligence platform designed for visual market analysis and network provider tracking. Built with React and optimized for large datasets, it transforms raw CSV/Excel leads into actionable geospatial intelligence.

![SwitchRadar Preview](https://via.placeholder.com/1200x600?text=SwitchRadar+Geospatial+Intelligence)

## 🚀 Key Features

- **📍 Immersive Mapping**: Full-screen interactive map with advanced clustering and "Spiderfy" animations for overlapping leads.
- **🎨 Brand Integration**: Automatic color-coding for major South African providers (MTN, Telkom, Vodacom, VOX, etc.).
- **⚡ High Performance**: Optimized to handle 2000+ leads with zero lag using React memoization and IndexedDB.
- **🔄 Smart Import Engine**: Intelligent column mapping with automatic coordinate extraction from Google Maps links.
- **💾 Local Persistence**: All data stays in your browser via IndexedDB for instant loads and offline capability.
- **📊 Dual Mode View**: Seamlessly toggle between a dense data table and a high-level map visualization.

## 🛠 Tech Stack

- **Core**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **Database**: IndexedDB (via Dexie.js)
- **Mapping**: Leaflet, React-Leaflet, MarkerCluster
- **Icons**: Lucide React

## 🎯 Brand Color Guide

SwitchRadar automatically maps the following providers to their official brand colors:

| Provider | Color | HEX |
| :--- | :--- | :--- |
| **MTN** | Yellow | `#EFCC00` |
| **Telkom** | Blue | `#005FB8` |
| **Vodacom** | Red | `#E60000` |
| **TELKMOBL** | Turquoise | `#40E0D0` |
| **VOX** | Lime Green | `#32CD32` |
| **HEROGNP** | Orange | `#FF8C00` |
| **BACKSPACE** | Dark Blue | `#00008B` |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/blakethebuilder/switchradar.git
   cd switchradar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

## 🐳 Docker & VPS Deployment

SwitchRadar is container-ready. To deploy on your own VPS (e.g., via Dokploy):

```bash
docker build -t switchradar .
docker run -p 80:80 switchradar
```

*See [DOKPLOY.md](./DOKPLOY.md) for detailed deployment instructions.*

## 📂 Project Structure

- `src/components`: UI components (Map, Table, Modals, Nav).
- `src/utils`: Data processing engine, color mapping, and coordinate sniffer.
- `src/db.ts`: IndexedDB schema and Dexie configuration.
- `src/types`: TypeScript definitions for project-wide safety.

## 📄 License

MIT Copyright (c) 2026 Blake The Builder.
