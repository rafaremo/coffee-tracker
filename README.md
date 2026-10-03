# ☕ Coffee Tracker

Track your specialty coffee journey with a beautiful web dashboard, full authentication, photo uploads, and MCP server for AI agents.

Built with **Remix 3**, **Prisma**, **SQLite**, **Tailwind CSS**, **Chart.js**, and **Better Auth**.

## Features

- **Full coffee profile tracking**: origin, variety, process, roast level, altitude, tasting notes, SCA scores
- **Photo support**: attach pictures of your coffee bags with drag & drop
- **User authentication**: email/password login with Better Auth (every user sees only their coffees)
- **Web dashboard**: interactive charts showing your favorite regions, varieties, brewing methods, and more
- **MCP Server**: control your coffee database from any AI agent (Claude, ChatGPT, etc.)
  - **STDIO** (local): for Claude Desktop/Code
  - **HTTP**: for simple HTTP clients
  - **Streamable HTTP**: for ChatGPT's MCP integration with SSE
- **SQLite database**: simple, portable, no setup required
- **All fields optional**: not every coffee needs every detail
- **Coffee-themed UI**: warm browns, amber, cream, espresso, and latte colors

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev --name init
npx prisma db seed

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

## Authentication

The app uses **Better Auth** with email/password. Register at `/register`, login at `/login`. All coffee data is scoped to the logged-in user.

## MCP Server Options

### 1. STDIO (Local - Claude Desktop/Code)

```json
{
  "mcpServers": {
    "coffee-tracker": {
      "command": "npx",
      "args": ["tsx", "app/lib/mcp-server.ts"],
      "description": "Coffee Tracker MCP server"
    }
  }
}
```

### 2. HTTP (REST API)

```bash
npm run mcp:http
# Server runs on http://localhost:3001/mcp
# Auth: Bearer <MCP_TOKEN>
```

### 3. Streamable HTTP (ChatGPT MCP)

```bash
npm run mcp:streamable
# Server runs on http://localhost:3001/mcp
# Supports SSE notifications + JSON-RPC over HTTP
# Auth: Bearer <MCP_TOKEN>
```

**For ChatGPT MCP integration:**

| Field | Value |
|-------|-------|
| **Tipo** | HTTP secuenciable |
| **URL** | `https://tu-dominio.com:3001/mcp` |
| **Variable de entorno del token** | `MCP_BEARER_TOKEN` |
| **Encabezado** | `Authorization: Bearer <tu-token>` |

### Available MCP Tools

- `list_coffees` - List all coffee entries with optional filters
- `get_coffee` - Get detailed info about a coffee by ID
- `add_coffee` - Add a new coffee entry
- `update_coffee` - Update an existing coffee entry
- `delete_coffee` - Delete a coffee entry
- `get_stats` - Get collection statistics
- `get_favorites` - Get your favorite coffees

## Coffee Data Fields

All fields are optional:

| Category | Fields |
|----------|--------|
| **Basic** | name, brand, photo, is_favorite, tags, personal_notes |
| **Origin** | country, region, farm, producer, altitude, variety, process, harvest_date, lot |
| **Roasting** | roast_level, roast_date, roaster_notes |
| **Cupping** | my_rating (0-10), sca_score (0-100), tasting_notes, body, acidity, sweetness, aroma, aftertaste |
| **Brewing** | brewing_methods (comma-separated) |
| **Purchase** | date, place, price_per_kg, weight_g |

## Docker Deployment (Coolify)

```bash
# Build and run with docker-compose
# This starts both the web app (port 3000) and MCP server (port 3001)
docker-compose up -d
```

Or deploy directly to Coolify:
1. Connect your Git repository
2. Set build context to `./`
3. Expose port `3000` for the web app
4. Expose port `3001` for the MCP server
5. Add volume for `/app/data` to persist SQLite database
6. Set `BETTER_AUTH_SECRET` and `MCP_TOKEN` environment variables

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite database path (e.g., `file:./data/dev.db`) |
| `BETTER_AUTH_SECRET` | Yes | Secret for auth cookies (generate with `openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Yes | App base URL (e.g., `http://localhost:5173`) |
| `MCP_TOKEN` | No | Bearer token for MCP server auth (default: auto-generated) |
| `MCP_PORT` | No | Port for MCP server (default: 3001) |

## Project Structure

```
coffee-tracker/
├── app/
│   ├── components/           # React components
│   │   ├── Navbar.tsx
│   │   ├── StatCard.tsx
│   │   ├── CoffeeCard.tsx
│   │   └── PhotoUploader.tsx   # Drag & drop photo upload
│   ├── lib/
│   │   ├── auth.server.ts      # Better Auth configuration
│   │   ├── session.server.ts   # Session helpers
│   │   ├── db.server.ts        # Prisma client
│   │   ├── coffee.server.ts    # DB operations (user-scoped)
│   │   ├── mcp-server.ts       # STDIO MCP server
│   │   ├── mcp-http-server.ts  # HTTP MCP server
│   │   └── mcp-streamable-server.ts # Streamable HTTP MCP (ChatGPT)
│   ├── routes/
│   │   ├── _layout.tsx           # Shared layout + auth
│   │   ├── _index.tsx            # Dashboard with charts
│   │   ├── login.tsx             # Sign In
│   │   ├── register.tsx          # Sign Up
│   │   ├── logout.tsx
│   │   ├── api.auth.$.tsx        # Better Auth API endpoint
│   │   ├── api.upload.tsx        # Photo upload API
│   │   ├── coffees._index.tsx    # Coffee list
│   │   ├── coffees.$id.tsx       # Coffee detail
│   │   ├── coffees.new.tsx       # Add coffee
│   │   └── coffees.$id.edit.tsx  # Edit coffee
│   ├── root.tsx              # Root layout
│   ├── entry.server.tsx      # SSR entry
│   └── tailwind.css          # Tailwind styles
├── prisma/
│   ├── schema.prisma         # Database schema (Coffee + Auth tables)
│   └── seed.ts               # Seed data (6 specialty coffees)
├── public/
├── Dockerfile              # Web app Docker image
├── Dockerfile.mcp          # MCP server Docker image
├── docker-compose.yml      # Full stack with app + mcp
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## Color Palette

| Token | Color | Usage |
|-------|-------|-------|
| coffee-50 | #fdf8f6 | Page background |
| coffee-100 | #f2e8e5 | Card backgrounds |
| coffee-500 | #a07e6a | Secondary text |
| coffee-700 | #634832 | Primary text |
| coffee-800 | #4a3428 | Dark text |
| coffee-900 | #2b1d15 | Darkest text |
| espresso-600 | #67431a | Primary buttons |
| latte-200 | #ffeacc | Highlight backgrounds |
| crema-500 | #ffc366 | Accent |
| roast.light | #d4a574 | Light roast indicator |
| roast.dark | #3e2723 | Dark roast indicator |

## License

MIT © 2025 Rafael González Vázquez
