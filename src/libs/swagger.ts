import swagger from "@elysiajs/swagger";

export const docs = swagger({
  documentation: {
    info: {
      title: "rizkyhaksono's v3 elysiaJS APIs Documentation",
      version: "3.0.1",
    },
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
    ],
  },
});