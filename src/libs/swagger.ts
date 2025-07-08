import swagger from "@elysiajs/swagger";

export const docs = swagger({
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
      }
    ],
  },
  path: "/swagger"
});