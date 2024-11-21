import swagger from "@elysiajs/swagger";

export const docs = swagger({
  documentation: {
    info: {
      title: "rizkyhaksono v3 elysiaJS APIs Documentation",
      version: "3.0.0",
    },
    tags: [
      {
        name: "Work",
        description: "Rizky Haksono works endpoints"
      },
      {
        name: "Education",
        description: "Rizky Haksono educations endpoints"
      },
      {
        name: "Project",
        description: "Rizky Haksono projects endpoints"
      },
      {
        name: "AI",
        description: "Rizky Haksono AI endpoints",
        externalDocs: {
          description: "AI documentation",
          url: "https://ai.rizkyhaksono.com"
        }
      }
    ],
  },
});