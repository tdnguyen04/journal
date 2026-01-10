# Journal App

A personal journaling application with Telegram bot integration for effortless task and note tracking.

## Features

### Core Functionality
- **Task Tracking**: Log tasks with automatic time tracking
- **Quick Notes**: Save fleeting thoughts without time tracking (`/note` command)
- **Task Chaining**: Automatically chain tasks that happen within your configured threshold
- **Timeline View**: Visualize your day in a chronological timeline
- **List View**: Browse logs in a clean list format
- **Browser & Telegram**: Log from both web interface and Telegram bot

### Version 3: Caring Bot (Current)

**AI-Powered Interactions:**
- **Contextual Gap Check-ins**: When logging a task with a time gap, the bot uses AI to generate warm, contextual messages instead of rigid questions
- **Smart Task Summarization**: Long task names are intelligently summarized for better readability in gap messages
- **Personalized Note Acknowledgments**: Notes receive personalized acknowledgments based on content (e.g., "📝 Rough day. Take it easy.")

**Improved User Experience:**
- **Inline Buttons**: Replace force-reply with flexible inline buttons (Yes/Skip/Specify) - users can respond via button or type freely
- **Previous Task Context**: Gap messages explicitly mention the previous task name, not generic "last log"
- **Configurable Auto-Chain**: User can customize the threshold for automatic task chaining (default: 15 minutes)
- **Enhanced Bot Messages**: All bot responses are friendlier, more informative, and guide users naturally

**Development Improvements:**
- **Local Docker Setup**: PostgreSQL database via Docker for isolated local development
- **Polling Fallback**: Automatic polling fallback for local dev (realtime via Supabase in production)
- **Migration Workflow**: Manual migration workflow against Supabase before deployment

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Prisma ORM
- **Database**: PostgreSQL (local via Docker, production via Supabase)
- **Authentication**: Supabase Auth
- **Telegram Integration**: Telegram Bot API
- **AI**: OpenAI GPT-4o-mini (for contextual responses, duration parsing)
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- Docker Desktop (for local database)
- Supabase account (for production)
- Telegram Bot Token (create via [@BotFather](https://t.me/botfather))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd journal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create `.env.local`:
   ```env
   # Database (local Docker)
   DATABASE_URL="postgresql://journal:journal_dev@localhost:5432/journal"
   
   # Supabase (production only - set in Vercel)
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # Telegram Bot
   TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="your-bot-username"
   
   # OpenAI (for AI features)
   OPENAI_API_KEY="your-openai-api-key"
   
   # Local dev realtime fallback (optional)
   NEXT_PUBLIC_USE_POLLING=true
   ```

4. **Start local database**
   ```bash
   npm run db:start
   # Or use the full setup script:
   npm run dev:setup  # Starts DB + ngrok
   ```

5. **Set up database schema**
   ```bash
   npx prisma db push
   ```

6. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

7. **Run development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Daily Development

1. **Start local environment:**
   ```bash
   npm run dev:setup  # Starts Docker DB + ngrok for Telegram testing
   npm run dev        # Start Next.js dev server
   ```

2. **Make changes and test locally**

3. **Database changes:**
   ```bash
   # Make changes to prisma/schema.prisma
   npx prisma db push  # Apply to local Docker DB
   npx prisma generate # Regenerate client
   ```

### Deploying Changes

1. **Run migrations against Supabase (before deploying):**
   ```bash
   # Set SUPABASE_DATABASE_URL in .env.local (direct connection, port 5432)
   npm run migrate:supabase
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: description"
   git push
   ```

3. **Vercel automatically builds** (migrations already applied, so build runs cleanly)

## Database Migrations

### Creating Migrations

**Option 1: Using `prisma migrate dev` (recommended for future)**
```bash
# After fixing shadow database setup
npx prisma migrate dev --name migration_name
```

**Option 2: Manual migration (current workflow)**
1. Make schema changes in `prisma/schema.prisma`
2. Create folder: `prisma/migrations/YYYYMMDDHHMMSS_description/`
3. Create `migration.sql` with SQL changes
4. Commit the migration file

### Applying Migrations

**Local (Docker):**
```bash
npx prisma db push  # Quick sync for dev
```

**Production (Supabase):**
```bash
npm run migrate:supabase  # Manual migration before deploy
```

## Project Structure

```
journal/
├── app/
│   ├── (protected)/        # Protected routes (auth required)
│   │   ├── home/           # Main journal interface
│   │   └── settings/       # User settings
│   ├── api/
│   │   └── telegram/       # Telegram webhook endpoints
│   └── auth/               # Authentication pages
├── components/
│   ├── ui/                 # Reusable UI components
│   └── tri-ui/             # Custom UI components
├── lib/
│   ├── telegram/           # Telegram bot logic
│   │   ├── client.ts       # Telegram API client
│   │   ├── handlers.ts     # Message/command handlers
│   │   └── ai.ts           # AI-powered features
│   ├── prisma/             # Prisma client
│   └── supabase/           # Supabase client setup
├── prisma/
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Database schema
└── scripts/
    ├── dev-start.ps1       # Development setup script
    └── migrate-supabase.js # Manual migration script
```

## Telegram Bot Commands

- **Regular text**: Logs as a task with time tracking
- **`/note [text]`**: Saves as a quick note (no time tracking)
- **`> text`**: Chains to the last task (quick chain)
- **`/help`**: Shows all available commands
- **`/logout`**: Disconnects Telegram account

## Version History

### Version 3.0 - Caring Bot
- AI-powered contextual gap check-ins
- Inline buttons replacing force-reply
- Smart task summarization
- Personalized note acknowledgments
- Configurable auto-chain threshold
- Enhanced bot messaging throughout
- Local Docker setup for development
- Polling fallback for local dev realtime

### Version 2.0
- Timezone support with user preferences
- Default timezone changed to EST (America/New_York)
- Improved Telegram connection flow
- Enhanced bot responses and error handling

### Version 1.0
- Basic task and note logging
- Telegram bot integration
- Browser interface
- Timeline and list views

## License

Private project
