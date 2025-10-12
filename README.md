# Portfolio v3 API

A comprehensive REST API built with Elysia.js and Bun runtime for rizkyhaksono's portfolio website.

## 🚀 Features

### Core Features
- **Authentication** - OAuth2 with Google, JWT-based sessions
- **Portfolio Management** - Projects, work experience, and education CRUD
- **Asset Management** - Cloudinary and MinIO integration for file uploads
- **AI Integration** - AI-powered chat functionality

### New Integrations
- **🎵 Spotify** - Now playing, recently played, and top tracks
- **💼 LinkedIn** - Certifications and licenses scraping
- **🌍 Duolingo** - Learning progress and streak tracking
- **🇯🇵 Japanese Quiz** - JLPT N5-N1 vocabulary quizzes
- **📊 Analytics** - Page view tracking and real-time metrics
- **⛓️ Web3** - Blockchain wallet verification and NFT metadata

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Database**: Prisma ORM
- **Authentication**: Lucia Auth
- **Documentation**: Swagger/OpenAPI

## 📦 Installation

### System Requirements

**For YouTube Downloader feature, install yt-dlp:**
```bash
# macOS
brew install yt-dlp

# Linux
pip install yt-dlp
# or
sudo apt install yt-dlp

# Windows
pip install yt-dlp
# or download from https://github.com/yt-dlp/yt-dlp/releases
```

### Install API

```bash
# Clone repository
git clone https://github.com/rizkyhaksono/portfolio-v3-api.git
cd portfolio-v3-api

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env

# Run database migrations
bunx prisma migrate dev

# Start development server
bun run dev
```

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=3031
DOMAIN=http://localhost:3031
DATABASE_URL=postgresql://user:password@localhost:5432/db

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PASSWORD_PEPPER=your_password_pepper

# Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MINIO_HOST=your_minio_host
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

# Optional Integrations
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
PROXYCURL_API_KEY=your_proxycurl_key (for LinkedIn)
```

## 📚 API Documentation

Once running, visit:
- Swagger UI: `http://localhost:3031/swagger`
- API Base: `http://localhost:3031/v3`

### Main Endpoints

#### Authentication
- `POST /v3/auth/signup` - Register new user
- `POST /v3/auth/login` - Login with credentials
- `POST /v3/auth/logout` - Logout current session
- `GET /v3/auth/provider/:provider` - OAuth2 login

#### Portfolio
- `GET /v3/project` - Get all projects
- `POST /v3/project` - Create project
- `GET /v3/work` - Get work experience
- `GET /v3/education` - Get education history

#### Spotify
- `GET /v3/spotify/now-playing?token=TOKEN` - Currently playing track
- `GET /v3/spotify/recently-played?token=TOKEN` - Recently played
- `GET /v3/spotify/top-tracks?token=TOKEN` - Top tracks
- `GET /v3/spotify/search?q=QUERY` - Search Spotify

#### Duolingo
- `GET /v3/duolingo/profile?username=USER` - User profile
- `GET /v3/duolingo/streak?username=USER` - Current streak
- `GET /v3/duolingo/daily-goal?username=USER` - Daily progress

#### Japanese Quiz
- `GET /v3/japanese-quiz/vocabulary?level=N5` - Get vocabulary
- `GET /v3/japanese-quiz/quiz?level=N5&count=10` - Generate quiz
- `GET /v3/japanese-quiz/random?level=N5` - Random word
- `POST /v3/japanese-quiz/verify` - Verify answer

#### Analytics
- `POST /v3/analytics/track` - Track page view
- `GET /v3/analytics/stats` - Get statistics
- `GET /v3/analytics/top-pages` - Most visited pages
- `GET /v3/analytics/realtime` - Real-time data

#### Web3
- `GET /v3/web3/wallet/:address` - Wallet information
- `POST /v3/web3/verify-signature` - Verify signature
- `GET /v3/web3/nft/:contract/:tokenId` - NFT metadata
- `GET /v3/web3/gas-price` - Current gas prices

#### LinkedIn
- `GET /v3/linkedin/certifications` - Get certifications

## 🔐 Authentication

### Spotify
1. Create app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Get Client ID and Secret
3. For user endpoints, implement OAuth2 flow to get access token

### Duolingo
Uses unofficial API - no authentication required
- Just provide username in query parameters

### LinkedIn
Requires external scraping service:
- [Proxycurl](https://nubela.co/proxycurl/) - Paid API
- Or manually update certifications via POST endpoint

## 📊 Analytics Recommendations

### Self-Hosted Options
- **Umami** - Simple, privacy-focused ([umami.is](https://umami.is))
- **Plausible** - Lightweight analytics ([plausible.io](https://plausible.io))
- **Matomo** - Full-featured ([matomo.org](https://matomo.org))

### Cloud-Based
- **Vercel Analytics** - Built-in with Vercel
- **Cloudflare Web Analytics** - Free tier available

## 🌐 Web3 Integration

To use Web3 features, install ethers.js:

```bash
bun add ethers
```

Supported features:
- Wallet verification
- ENS resolution
- NFT metadata
- Gas price tracking
- Transaction details

## 📝 Development

```bash
# Development
bun run dev

# Build
bun run build

# Production
bun run start

# Database
bunx prisma studio          # Open Prisma Studio
bunx prisma migrate dev     # Run migrations
bunx prisma generate        # Generate client
```

## 🧪 Testing

```bash
# Run tests (if configured)
bun test
```

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

**rizkyhaksono**
- GitHub: [@rizkyhaksono](https://github.com/rizkyhaksono)
- LinkedIn: [rizkyhaksono](https://linkedin.com/in/rizkyhaksono)
- Website: [rizkyhaksono.vercel.app](https://rizkyhaksono.vercel.app)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show your support

Give a ⭐️ if this project helped you!