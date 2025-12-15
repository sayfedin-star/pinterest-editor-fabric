# Pinterest Template Editor

A professional-grade **bulk Pinterest pin generator** built with Next.js 16, Fabric.js canvas, and Supabase. Create templates with dynamic text and image placeholders, then generate hundreds of unique pins from CSV data.

## ✨ Features

- **Visual Template Editor** - Drag-and-drop canvas with text, images, and shapes
- **Dynamic Fields** - Use `{{field_name}}` placeholders bound to CSV columns
- **Bulk Generation** - Generate unlimited pins from a single template + CSV
- **Canva Import** - Import Canva designs as background layers
- **Multi-select & Alignment** - Professional design tools with magnetic snapping
- **Auto-Save** - Automatic saving with 30s debounce to prevent data loss
- **Undo/Redo** - Full history management with keyboard shortcuts
- **Cloud Storage** - Templates and generated pins stored in S3-compatible Tebi

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 App                         │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ├── EditorCanvas.tsx (Fabric.js canvas with zoom/pan)      │
│  ├── PropertiesPanel (Modular property sections)            │
│  ├── LayersPanel.tsx (Drag-drop z-ordering)                 │
│  └── Toolbar.tsx (Element creation, formatting)             │
├─────────────────────────────────────────────────────────────┤
│  Canvas Management (Modular)                                │
│  ├── CanvasManager.ts (567 lines - Orchestrator)            │
│  ├── ObjectFactory.ts (Fabric object creation/sync)         │
│  ├── ViewportManager.ts (Zoom, size, background)            │
│  └── PerformanceMonitor.ts (FPS tracking)                   │
├─────────────────────────────────────────────────────────────┤
│  State Management (Zustand - Facade Pattern)                │
│  ├── editorStore.ts (Facade → delegates to stores below)    │
│  ├── elementsStore.ts (Element CRUD)                        │
│  ├── selectionStore.ts (Selection state)                    │
│  ├── canvasStore.ts (Canvas settings)                       │
│  └── templateStore.ts (Template metadata)                   │
├─────────────────────────────────────────────────────────────┤
│  API Routes                                                 │
│  ├── /api/upload-pin (Upload generated pins to S3)          │
│  ├── /api/upload-thumbnail (Template thumbnails)            │
│  ├── /api/proxy-image (CORS proxy for S3 images)            │
│  └── /api/campaigns/[id]/* (Campaign management)            │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ├── Supabase (PostgreSQL + Auth)                           │
│  └── Tebi S3 (Image storage)                                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run development server
npm run dev

# Run E2E tests (optional)
npm run e2e
```

Open [http://localhost:3000](http://localhost:3000) to access the editor.

## ⚙️ Environment Variables

Create a `.env.local` file with:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Tebi S3 Storage (Required for pin generation)
TEBI_ENDPOINT=s3.tebi.io
TEBI_ACCESS_KEY=your-access-key
TEBI_SECRET_KEY=your-secret-key
TEBI_BUCKET=your-bucket-name
```

## 📁 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   ├── editor/              # Template editor page
│   ├── dashboard/           # Dashboard & campaigns
│   └── settings/            # User settings
├── components/
│   ├── canvas/              # Fabric.js canvas components
│   ├── panels/              # Right sidebar panels
│   │   └── properties/      # Modular property sections
│   ├── layout/              # Header, Sidebar, Toolbar
│   └── ui/                  # Shared UI components
├── stores/                  # Zustand state stores
│   ├── editorStore.ts       # Facade store (main entry)
│   ├── elementsStore.ts     # Element CRUD
│   ├── selectionStore.ts    # Selection state
│   ├── canvasStore.ts       # Canvas settings
│   └── templateStore.ts     # Template metadata
├── lib/
│   ├── canvas/              # Canvas management modules
│   │   ├── CanvasManager.ts # Main orchestrator
│   │   ├── ObjectFactory.ts # Fabric object creation
│   │   ├── ViewportManager.ts
│   │   └── PerformanceMonitor.ts
│   ├── fabric/              # Fabric.js utilities
│   ├── db/                  # Database operations
│   └── utils/               # CSV parsing, field detection
├── hooks/                   # Custom React hooks
│   └── useAutoSave.ts       # Auto-save functionality
├── types/
│   └── editor.ts            # TypeScript types
└── e2e/                     # Playwright E2E tests
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run E2E tests (headless)
npm run e2e

# Run E2E tests with UI
npm run e2e:ui
```

## 🔌 API Reference

### `POST /api/upload-pin`
Upload generated pin image to S3.

**Body (JSON):**
```json
{
  "campaignId": "string",
  "pinNumber": 0,
  "imageData": "base64-encoded-png"
}
```

### `POST /api/upload-thumbnail`
Upload template thumbnail.

### `GET /api/proxy-image?url=...`
Proxy S3 images to bypass CORS restrictions.

## 🎨 Using Dynamic Fields

1. Add a text or image element
2. Enable "Dynamic" toggle in properties panel
3. Enter field name (e.g., `title`, `image_url`)
4. Reference in text with `{{field_name}}`
5. Match field names to CSV column headers

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+D` | Duplicate element |
| `Delete` | Delete selected |
| `Arrow keys` | Move element (1px) |
| `Shift+Arrow` | Move element (10px) |

## 📦 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add environment variables
4. Deploy

### Manual
```bash
npm run build
npm start
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| React 19 | UI library with React Compiler |
| Zustand | Lightweight state management |
| Fabric.js 6 | 2D canvas rendering engine |
| Supabase | PostgreSQL database + Auth |
| Tebi S3 | S3-compatible object storage |
| Tailwind CSS 4 | Utility-first styling |
| Radix UI | Accessible UI primitives |
| Playwright | E2E testing framework |

## 📄 License

Private - All rights reserved
