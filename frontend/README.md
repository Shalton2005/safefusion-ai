# SafeFusion AI - Frontend

The command center and dashboard interface for SafeFusion AI, built with React, Vite, and TypeScript.

## Features
- **Real-Time Dashboards**: Live CCTV feeds with bounding box overlays and dynamic sensor monitoring.
- **AI Copilot Interface**: Chat interface with agent reasoning streams and confidence visualizations.
- **Knowledge Graph Viewer**: Interactive concentric layout for visualizing plant topology.
- **State Management**: Highly optimized global state powered by Zustand.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Variables:
   Copy `.env.example` to `.env` (ensure `VITE_API_BASE_URL` points to your backend):
   ```bash
   cp .env.example .env
   ```

### Running the Application
Start the Vite development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.