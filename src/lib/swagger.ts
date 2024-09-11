import swagger from "@elysiajs/swagger";

export const docs = swagger({
  documentation: {
    info: {
      title: "rizkyhaksono v3 elysiaJS APIs Documentation",
      version: "3.0.0",
    },
    tags: [
      {
        name: "Authorization Service",
        description: "User account service auth endpoints",
      },
      {
        name: "Users",
        description: "User Profile service endpoints",
      },
      {
        name: "Portfolios",
        description: "Rizky Haksono portofolios endpoints",
      },
      {
        name: "Works",
        description: "Rizky Haksono works endpoints"
      },
    ],
  },
});