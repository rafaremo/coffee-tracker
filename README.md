# ☕ Coffee Tracker

Track your specialty coffee journey with a beautiful web dashboard and MCP server for AI agents.

Built with **Remix 3**, **Prisma**, **SQLite**, **Tailwind CSS**, and **Chart.js**.

## Features

- **Full coffee profile tracking**: origin, variety, process, roast level, altitude, tasting notes, SCA scores
- **Photo support**: attach pictures of your coffee bags
- **Web dashboard**: interactive charts showing your favorite regions, varieties, brewing methods, and more
- **MCP Server**: control your coffee database from any AI agent (Claude, etc.)
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

## MCP Server Setup

To connect the MCP server to Claude Code or other agents:

### Option 1: Direct command
Add to your MCP config:
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

### Option 2: Use the included config
```bash
# In Claude Code
/config
# Then add the mcp-config.json content to your MCP servers
```

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
docker-compose up -d
```

Or deploy directly to Coolify:
1. Connect your Git repository
2. Set build context to `./`
3. Expose port `3000`
4. Add volume for `/app/data` to persist SQLite database

## Project Structure

```
coffee-tracker/
├── app/
│   ├── components/        # React components
│   │   ├── Navbar.tsx
│   │   ├── StatCard.tsx
│   │   └── CoffeeCard.tsx
│   ├── lib/
│   │   ├── db.server.ts     # Prisma client
│   │   ├── coffee.server.ts  # DB operations
│   │   └── mcp-server.ts     # MCP server
│   ├── routes/
│   │   ├── _layout.tsx      # Shared layout
│   │   ├── _index.tsx       # Dashboard
│   │   ├── coffees._index.tsx # Coffee list
│   │   ├── coffees.$id.tsx   # Coffee detail
│   │   ├── coffees.new.tsx   # Add coffee
│   │   └── coffees.$id.edit.tsx # Edit coffee
│   ├── root.tsx            # Root layout
│   ├── entry.server.tsx    # SSR entry
│   └── tailwind.css        # Tailwind styles
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data
├── public/               # Static assets
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
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

MIT
