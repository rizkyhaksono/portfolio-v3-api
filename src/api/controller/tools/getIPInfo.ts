import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { lookupIP, isValidIP } from "@/utils/ipGeoLookup";

export default createElysia().get(
  "/ip",
  async ({
    query,
    request,
    server,
  }: {
    query: { address?: string };
    request: Request;
    server: any;
  }) => {
    const ip =
      query.address?.trim() ??
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      server?.requestIP(request)?.address ??
      "";

    if (!ip) {
      return { status: 400, message: "Could not determine IP address", data: null };
    }

    if (!isValidIP(ip)) {
      return { status: 400, message: "Invalid IP address format", data: null };
    }

    const geo = await lookupIP(ip);

    if (!geo) {
      return {
        status: 400,
        message: "IP lookup failed — address may be private or invalid",
        data: null,
      };
    }

    return { status: 200, message: "Success", data: geo };
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
