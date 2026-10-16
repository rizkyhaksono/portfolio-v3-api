import { describe, expect, it } from "bun:test";
import { LINKEDIN_CERTIFICATIONS_DATA } from "@/constants/certifications";

// Signed media.licdn.com URLs expire and then 403 "Invalid e query string".
describe("LINKEDIN_CERTIFICATIONS_DATA", () => {
  it("has no media.licdn.com link or image", () => {
    for (const cert of LINKEDIN_CERTIFICATIONS_DATA) {
      expect(cert.link ?? "").not.toContain("media.licdn.com");
      expect(cert.image ?? "").not.toContain("media.licdn.com");
    }
  });
});
