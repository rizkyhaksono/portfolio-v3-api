const IP_API_FIELDS =
  "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query";

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

export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  zip: string;
  timezone: string;
  coordinates: { lat: number; lon: number };
  isp: string;
  org: string;
  asn: string;
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

export function isValidIP(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || ipv6.test(ip);
}

/**
 * Lookup geolocation data for a public IP address.
 * Returns null for private/loopback IPs or on API failure.
 */
export async function lookupIP(ip: string): Promise<GeoLocation | null> {
  if (!isValidIP(ip) || isPrivateIP(ip)) return null;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=${IP_API_FIELDS}`,
    );

    if (!res.ok) return null;

    const data: IPApiResponse = await res.json();

    if (data.status === "fail") return null;

    return {
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
    };
  } catch {
    return null;
  }
}
