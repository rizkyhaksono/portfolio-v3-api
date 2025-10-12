import swagger from "@elysiajs/swagger";

export const docs = swagger({
  path: "/swagger",
  documentation: {
    info: {
      title: "rizkyhaksono's v3 elysiaJS APIs Documentation",
      version: "3.0.1",
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
        name: "Auth",
        description: "Auth endpoints to signup, login, logout, and provider oauth2",
      },
      {
        name: "Work",
        description: "Work endpoints to create, read, update, and delete work data",
      },
      {
        name: "Education",
        description: "Education endpoints to create, read, update, and delete education data",
      },
      {
        name: "Project",
        description: "Project endpoints to create, read, update, and delete project data",
      },
      {
        name: "AI",
        description: "AI endpoints to chat with AI",
      },
      {
        name: "User",
        description: "User endpoints to get and update user data",
      },
      {
        name: "Asset",
        description: "Asset endpoints to upload image, and get image from cloudinary or minio",
      },
      {
        name: "Youtube Downloader",
        description: "YouTube content processing endpoints for extracting video metadata and downloading videos in MP4/audio formats",
      },
      {
        name: "Spotify",
        description: "Spotify integration endpoints for retrieving currently playing tracks, recently played songs, and top tracks",
      },
      {
        name: "LinkedIn",
        description: "LinkedIn integration endpoints for scraping and managing professional certifications and licenses",
      },
      {
        name: "Duolingo",
        description: "Duolingo progress tracking endpoints for monitoring language learning streaks, XP, and daily goals",
      },
      {
        name: "Japanese Quiz",
        description: "Japanese vocabulary quiz endpoints with JLPT N5-N1 levels for learning Kotoba (words)",
      },
      {
        name: "Analytics",
        description: "Website analytics and performance metrics endpoints for tracking page views, visitor statistics, and real-time data",
      },
      {
        name: "Web3",
        description: "Blockchain and Web3 integration endpoints for wallet verification, NFT metadata, and smart contract interactions",
      }
    ],
  },
});