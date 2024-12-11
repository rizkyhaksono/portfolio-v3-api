import swagger from "@elysiajs/swagger";

export const docs = swagger({
  documentation: {
    info: {
      title: "rizkyhaksono's v3 elysiaJS APIs Documentation",
      version: "3.0.0",
    },
    tags: [
      {
        name: "Auth",
        description: "Rizky Haksono's authentication endpoints",
      },
      {
        name: "Work",
        description: "Rizky Haksono's works endpoints"
      },
      {
        name: "Education",
        description: "Rizky Haksono's educations endpoints"
      },
      {
        name: "Project",
        description: "Rizky Haksono's projects endpoints"
      },
      {
        name: "AI",
        description: "Rizky Haksono's AI endpoints",
      }
    ],
  },
});