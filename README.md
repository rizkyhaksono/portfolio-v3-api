# Portfolio v3 API

A modern, high-performance backend API built with **Elysia.js** and **Bun**, providing comprehensive services for portfolio management, authentication, social media integration, Web3 functionality, and more.

## Features

### Authentication & Authorization
- **Multi-Provider OAuth 2.0** (Google, GitHub, Discord, Facebook)
- **Email Conflict Prevention** - Prevents login with different providers using the same email
- **Role-Based Access Control** (Admin, User, Guest)
- **Session Management** with Lucia Auth
- **Cookie & Bearer Token** authentication

### Core Features
- **Public Chat System** - Users can post once per day with edit and soft delete capabilities
- **Cursor-Based Pagination** - Efficient pagination for all list endpoints
- **Image Management** - Upload avatars and banners with Minio, auto-delete old images
- **Asset Storage** - Support for Minio
- **Grafana Loki Integration** - Comprehensive logging and monitoring

### Portfolio Management
- **Projects** - Showcase your work with full CRUD operations
- **Work Experience** - Track your professional journey
- **Education** - Manage academic background
- **AI Chat** - Powered by Google Generative AI

### Integrations
- **Pokemon Database** - Full Pokemon data with pagination
- **Web3 Support**
  - Wallet balance checking (Ethereum, Polygon, BSC, Arbitrum, Optimism)
  - Real-time cryptocurrency prices
  - NFT data retrieval
  - Gas price monitoring
- **Social Media Downloaders**
  - YouTube (videos & audio)
  - TikTok (no watermark)
  - Instagram (posts, reels, stories)
  - Facebook (videos)
  - X/Twitter (videos & media)
- **Spotify Integration** - Currently playing, recently played, top tracks
- **LinkedIn Scraper** - Certifications and professional data
- **Duolingo Tracker** - Language learning progress
- **Japanese Quiz** - JLPT N5-N1 vocabulary quizzes

## Tech Stack

- **Runtime**: Bun (latest)
- **Framework**: Elysia.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Lucia + Arctic (OAuth)
- **Storage**: Minio
- **Logging**: Pino + Loki
- **Validation**: Zod
- **API Documentation**: Scalar (OpenAPI/Swagger)
- **Monitoring**: OpenTelemetry

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- PostgreSQL database
- Minio instance (for file storage)
- Optional:  Grafana Loki instance

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/rizkyhaksono/portfolio-v3-api.git
cd portfolio-v3-api
```

### 2. Install dependencies
```bash
bun install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
DOMAIN=localhost
BASE_URL=http://localhost:3121
PORT=3121

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/portfolio-v3"

# Authentication
PASSWORD_PEPPER=your-secret-pepper-string

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# Minio (S3-compatible storage)
MINIO_HOST=your-minio-host
MINIO_BUCKET_NAME=portfolio
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key

# Grafana Loki (optional)
LOKI_HOST=http://your-loki-host:3100
LOKI_USERNAME=admin
LOKI_PASSWORD=your-loki-password

# Web3 RPC URLs (optional)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://mainnet.optimism.io

# External APIs (optional)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
RAPIDAPI_KEY=your-rapidapi-key
ALCHEMY_API_KEY=your-alchemy-key
```

### 4. Run database migrations
```bash
bunx prisma migrate dev
```

### 5. Start the development server
```bash
bun dev
```

The API will be available at `http://localhost:3121`

## API Documentation

Interactive API documentation is available at:
- **Scalar UI**: `http://localhost:3121/docs` (recommended)
- **Swagger JSON**: `http://localhost:3121/docs/json`

## Authentication Flow

### OAuth Authentication
1. Initiate OAuth: `GET /v3/auth/{provider}` (google, github, discord, facebook)
2. User authorizes on provider's site
3. Callback: `GET /v3/auth/{provider}/callback`
4. Session cookie is set automatically

### Traditional Authentication
- **Sign up**: `POST /v3/auth/signup`
- **Login**: `POST /v3/auth/login`
- **Logout**: `POST /v3/auth/logout`

### Using the API
Include authentication in requests:
```bash
# Using Bearer token
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" http://localhost:3121/v3/me

# Using cookie (automatically set after login)
curl -b "auth_session=YOUR_SESSION_COOKIE" http://localhost:3121/v3/me
```

## Pagination

All list endpoints support cursor-based pagination:

```bash
# First page
GET /v3/projects?limit=10

# Next page using cursor
GET /v3/projects?cursor=BASE64_CURSOR&limit=10
```

Response format:
```json
{
  "status": 200,
  "message": "Success",
  "data": [...],
  "nextCursor": "BASE64_CURSOR_OR_NULL",
  "hasMore": true
}
```

## Key Endpoints

### Authentication
- `GET /v3/auth/{provider}` - OAuth initiation
- `POST /v3/auth/signup` - User registration
- `POST /v3/auth/login` - User login
- `POST /v3/auth/logout` - User logout

### Public Chat
- `GET /v3/public-chat` - Get all posts (paginated, public)
- `POST /v3/public-chat` - Create post (1 per day limit)
- `PATCH /v3/public-chat/:id` - Update own post
- `DELETE /v3/public-chat/:id` - Soft delete own post

### User Profile
- `GET /v3/me` - Get current user
- `PATCH /v3/me` - Update profile
- `POST /v3/me/avatar` - Upload avatar
- `POST /v3/me/banner` - Upload banner

### Portfolio
- `GET /v3/projects` - List projects (paginated)
- `GET /v3/work` - List work experience (paginated)
- `GET /v3/education` - List education (paginated)

### Pokemon
- `GET /v3/tools/pokemon` - List Pokemon (paginated)
- `GET /v3/tools/pokemon/:id` - Get Pokemon details

### Web3
- `GET /v3/web3/wallet/:address` - Check wallet balance
- `GET /v3/web3/crypto/price` - Get crypto prices
- `GET /v3/web3/crypto/:coin/chart` - Get price charts

### Social Media Downloaders
- `GET /v3/tools/youtube/info` - YouTube video info
- `GET /v3/tools/tiktok/downloader` - TikTok downloader
- `GET /v3/tools/instagram/downloader` - Instagram downloader
- `GET /v3/tools/facebook/downloader` - Facebook downloader
- `GET /v3/tools/x/downloader` - X/Twitter downloader

## Security Features

- **CSRF Protection** via origin verification
- **Rate Limiting** on sensitive endpoints
- **Password Hashing** with pepper
- **Secure Session Cookies** (httpOnly, secure in production)
- **Email Conflict Prevention** across OAuth providers
- **Role-Based Access Control** (Admin, User, Guest)

## Project Structure

```
portfolio-v3-api/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── api/
│   │   ├── controller/        # Route controllers
│   │   │   ├── auth/         # Authentication
│   │   │   ├── publicChat/   # Public chat
│   │   │   ├── user/         # User management
│   │   │   ├── project/      # Projects
│   │   │   ├── work/         # Work experience
│   │   │   ├── education/    # Education
│   │   │   ├── tools/        # Utilities & integrations
│   │   │   └── web3/         # Web3 endpoints
│   │   └── index.ts          # API routes aggregator
│   ├── libs/                 # Core libraries
│   │   ├── authGuard.ts      # Auth middleware
│   │   ├── roleGuards.ts     # RBAC middleware
│   │   ├── luciaAuth.ts      # Lucia configuration
│   │   ├── oauthProviders.ts # OAuth setup
│   │   ├── lokiLogger.ts     # Loki logging
│   │   ├── minioClient.ts    # Minio client
│   │   └── prismaDatabase.ts # Prisma client
│   ├── models/               # Elysia type models
│   ├── utils/                # Utility functions
│   │   ├── pagination.ts     # Pagination helpers
│   │   ├── oauthUtils.ts     # OAuth utilities
│   │   └── minioUtils.ts     # Minio utilities
│   ├── constants/            # Constants & exceptions
│   └── index.ts             # Application entry point
└── package.json
```

## Author

**Rizky Haksono**
- GitHub: [@rizkyhaksono](https://github.com/rizkyhaksono)
- Email: rizkyhaksono@gmail.com

---

Built with ❤️ using Bun and Elysia.js
