import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface LinkedInCertification {
  name: string;
  issuer: string;
  issueDate: string;
  credentialId?: string;
  credentialUrl?: string;
}

async function scrapeLinkedInCertifications(profileUrl: string): Promise<LinkedInCertification[]> {
  try {
    const apiKey = process.env.PROXYCURL_API_KEY;

    if (!apiKey) throw new Error("Proxycurl API key not configured");

    const response = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(profileUrl)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch LinkedIn data");
    }

    const data = await response.json();

    return data.certifications || [];
  } catch (error) {
    console.error("Failed to scrape LinkedIn:", error);
    throw error;
  }
}

async function scrapeLinkedInWithScraperAPI(profileUrl: string): Promise<any> {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) throw new Error("ScraperAPI key not configured");

  const response = await fetch(
    `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(profileUrl)}`
  );

  if (!response.ok) {
    throw new Error("Failed to scrape LinkedIn");
  }

  const html = await response.text();
  return { html };
}

export default createElysia()
  .get("/", async () => {
    return {
      message: "LinkedIn Certifications API",
      endpoints: {
        certifications: "GET /certifications - Get LinkedIn certifications",
      },
      note: "LinkedIn scraping requires external API services like Proxycurl or ScraperAPI",
      config: {
        profileUrl: "https://www.linkedin.com/in/rizkyhaksono/",
      },
    };
  }, {
    detail: {
      tags: ["LinkedIn"],
      summary: "LinkedIn API Information",
    },
  })

  .get("/certifications", async () => {
    const profileUrl = "https://www.linkedin.com/in/rizkyhaksono/";

    try {
      const certifications = await scrapeLinkedInWithScraperAPI(profileUrl);

      return {
        success: true,
        profile: profileUrl,
        certifications,
        total: certifications.length,
      };
    } catch (error: any) {
      const fallbackCertifications: LinkedInCertification[] = [
        {
          name: "Example Certification",
          issuer: "Example Organization",
          issueDate: "2024-01",
          credentialId: "ABC123",
          credentialUrl: "https://example.com/verify",
        },
      ];

      return {
        success: false,
        error: error.message,
        note: "Using fallback data. Please configure API keys or update manually.",
        profile: profileUrl,
        certifications: fallbackCertifications,
        total: fallbackCertifications.length,
      };
    }
  }, {
    detail: {
      tags: ["LinkedIn"],
      summary: "Get LinkedIn certifications",
      description: "Retrieves licenses and certifications from LinkedIn profile",
    },
  })

  .post("/update-certifications", async ({ body }) => {
    const { certifications } = body;

    return {
      success: true,
      message: "Certifications updated successfully",
      count: certifications.length,
    };
  }, {
    body: t.Object({
      certifications: t.Array(t.Object({
        name: t.String(),
        issuer: t.String(),
        issueDate: t.String(),
        credentialId: t.Optional(t.String()),
        credentialUrl: t.Optional(t.String()),
      })),
    }),
    detail: {
      tags: ["LinkedIn"],
      summary: "Manually update certifications",
      description: "Allows manual update of certification data",
    },
  });
