import swagger from "@elysiajs/swagger";

export const docs = swagger({
  path: "/docs",
  provider: "scalar",
  scalarConfig: {
    theme: "mars",
    darkMode: true,
    favicon: "https://nateee.com/favicon.ico",
    metaData: {
      title: "Portfolio v3 API Documentation",
      description: "Comprehensive API documentation for Portfolio v3 backend services.",
      keywords: "Portfolio, API, Documentation, OAuth, Projects, Work, Education, AI, Pokemon, Web3, Social Media Downloaders",
    },
  },
  documentation: {
    info: {
      title: "Portfolio v3 API - Comprehensive Backend Services",
      version: "3.2.0",
      description: `
# Portfolio v3 API Documentation

A modern, feature-rich backend API built with Elysia.js and Bun, providing comprehensive services for portfolio management, social media integration, Web3 functionality, and more.

## Features

- **Multi-Provider OAuth Authentication** (Google, GitHub, Discord, Facebook)
- **Role-Based Access Control** (Admin, User, Guest)
- **Public Chat System** with rate limiting
- **Cursor-Based Pagination** for all list endpoints
- **Image Management** with Minio storage
- **Pokemon Database** integration
- **Web3 Support** (wallet checking, crypto prices, NFTs)
- **Social Media Downloaders** (YouTube, TikTok, Instagram, Facebook, X/Twitter)
- **Analytics & Monitoring** with Grafana Loki
- **Project Portfolio Management**
- **Education & Work Experience Management**

## Authentication

Most endpoints require authentication via Bearer token or session cookie.

### OAuth Providers
- Google: \`/v3/auth/google\`
- GitHub: \`/v3/auth/github\`
- Discord: \`/v3/auth/discord\`
- Facebook: \`/v3/auth/facebook\`

## Rate Limits

- Public Chat: 1 post per day per user
- API calls: Standard rate limiting applies

## Pagination

All list endpoints support cursor-based pagination:
- \`cursor\`: Optional cursor for pagination
- \`limit\`: Items per page (default: 10, max: 50)
      `,
      contact: {
        name: "API Support",
        email: "rizkyhaksono@gmail.com",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === "development"
          ? `http://localhost:${process.env.PORT ?? 3031}`
          : "https://api.nateee.com",
        description: process.env.NODE_ENV === "development" ? "Development server" : "Production server"
      },
      {
        url: "https://api.natee.my.id",
        description: "Natee's production server - my.id domain"
      },
      {
        url: "https://api.nateee.com",
        description: "Natee's production server - .com domain"
      }
    ],
    tags: [
      {
        name: "General",
        description: "General endpoints for health checks and other utilities.",
      },
      {
        name: "Authentication",
        description: "Multi-provider OAuth authentication (Google, GitHub, Discord, Facebook),  and session management. Supports email conflict prevention across providers.",
      },
      {
        name: "Auth",
        description: "Manual authentication endpoints for login, signup, password reset, and session management.",
      },
      {
        name: "Public Chat",
        description: "Community chat system where authenticated users can post once per day, edit their posts, and view all public messages with pagination.",
      },
      {
        name: "User",
        description: "User profile management including avatar/banner uploads, profile updates, and user information retrieval.",
      },
      {
        name: "Project",
        description: "Portfolio project management with full CRUD operations and cursor-based pagination. Showcase your work with images, descriptions, and links.",
      },
      {
        name: "Work",
        description: "Work experience management with full CRUD operations and pagination. Track job titles, companies, durations, and descriptions.",
      },
      {
        name: "Education",
        description: "Educational background management with full CRUD operations and pagination. Manage degrees, institutions, and academic achievements.",
      },
      {
        name: "AI",
        description: "AI-powered chat endpoints using Google Generative AI for intelligent conversations and assistance.",
      },
      {
        name: "Pokemon",
        description: "Pokemon database integration with paginated listings and detailed Pokemon information from PokeAPI.",
      },
      {
        name: "Social Media Downloaders",
        description: "Download videos and media from various social platforms: YouTube, TikTok, Instagram, Facebook, and X/Twitter.",
      },
      {
        name: "Web3",
        description: "Blockchain integration for wallet balance checking, cryptocurrency price tracking, NFT data, and gas price monitoring across multiple networks (Ethereum, Polygon, BSC, etc.).",
      },
      {
        name: "Spotify",
        description: "Spotify integration for retrieving currently playing tracks, recently played songs, and top tracks.",
      },
      {
        name: "LinkedIn",
        description: "LinkedIn integration for scraping and managing professional certifications and licenses.",
      },
      {
        name: "Duolingo",
        description: "Duolingo progress tracking for monitoring language learning streaks, XP, and daily goals.",
      },
      {
        name: "Japanese Quiz",
        description: "Japanese vocabulary quiz system with JLPT N5-N1 levels for learning Kotoba (words).",
      },
      {
        name: "Assets",
        description: "Image asset management with Minio storage, supporting uploads, retrievals, and deletions.",
      },
      {
        name: "Indonesian Postal Code",
        description: "Indonesia postal code lookup service with detailed area information.",
      },
      {
        name: "Anime",
        description: "Anime random image retrieval from various categories for entertainment purposes.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your session token",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_session",
          description: "Session cookie authentication",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      },
    ],
  },
});