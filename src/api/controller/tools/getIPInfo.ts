import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

interface IPApiResponse {
  status: "success" | "fail";
  message?: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

function isValidIP(ip: string): boolean {
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplified)
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

export default createElysia().get(
  "/ip",
  async ({ query, request }: { query: { address?: string }; request: Request }) => {
    let ip = query.address?.trim();

    // Fall back to requester's IP
    if (!ip) {
      ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        "1.1.1.1"; // last resort public IP
    }

    if (!isValidIP(ip)) {
      return {
        status: 400,
        message: "Invalid IP address format",
        data: null,
      };
    }

    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      );

      if (!res.ok) throw new Error(`ip-api error: ${res.status}`);

      const data: IPApiResponse = await res.json();

      if (data.status === "fail") {
        return {
          status: 400,
          message: data.message ?? "IP lookup failed",
          data: null,
        };
      }

      return {
        status: 200,
        message: "Success",
        data: {
          ip: data.query,
          country: data.country,
          countryCode: data.countryCode,
          region: data.regionName,
          regionCode: data.region,
          city: data.city,
          zip: data.zip,
          timezone: data.timezone,
          coordinates: { lat: data.lat, lon: data.lon },
          isp: data.isp,
          org: data.org,
          asn: data.as,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        message: error.message ?? "Failed to fetch IP info",
        data: null,
      };
    }
  },
  {
    query: t.Object({
      address: t.Optional(
        t.String({ description: "IPv4 or IPv6 address. Omit to lookup the requester's IP." }),
      ),
    }),
    detail: {
      tags: ["Tools"],
      summary: "IP geolocation lookup",
      description:
        "Lookup geolocation, ISP, and timezone for an IPv4 or IPv6 address. Omit the address param to auto-detect the caller's IP.",
    },
  },
);
