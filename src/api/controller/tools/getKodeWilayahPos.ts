import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

export default createElysia()
  .get("/postal-code/info", async () => {
    return {
      message: "Indonesian Postal Code (Kode Pos) API",
      endpoints: {
        provinces: "GET /provinces - Get all provinces",
        cities: "GET /cities/:provinceId - Get cities by province ID",
        districts: "GET /districts/:cityId - Get districts by city ID",
        villages: "GET /villages/:districtId - Get villages by district ID",
        search: "GET /search?q=location_name - Search postal code by location name",
        postalCode: "GET /postal/:code - Get location details by postal code"
      },
      usage: {
        "Get provinces": "/provinces",
        "Get cities": "/cities/31",
        "Search location": "/search?q=jakarta",
        "Get by postal code": "/postal/12345"
      }
    };
  }, {
    detail: {
      tags: ["Indonesian Postal Code"],
      summary: "Indonesian Postal Code API Information"
    }
  })

  .get("/provinces", async () => {
    try {
      const response = await fetch("https://wilayah.id/api/provinces.json");
      const data = await response.json();

      return {
        success: true,
        data: data.data || data,
        total: data.data?.length || data.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch provinces data"
      };
    }
  }, {
    detail: {
      tags: ["Indonesian Postal Code"],
      summary: "Get all Indonesian provinces"
    }
  })

  .get("/cities/:provinceId", async ({ params }) => {
    const { provinceId } = params;

    try {
      const response = await fetch(`https://wilayah.id/api/regencies/${provinceId}.json`);
      const data = await response.json();

      return {
        success: true,
        data: data.data || data,
        total: data.data?.length || data.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch cities data"
      };
    }
  }, {
    params: t.Object({
      provinceId: t.String()
    }),
    detail: {
      tags: ["Indonesian Postal Code"],
      summary: "Get cities by province ID"
    }
  })

  .get("/districts/:cityId", async ({ params }) => {
    const { cityId } = params;

    try {
      const response = await fetch(`https://wilayah.id/api/districts/${cityId}.json`);
      const data = await response.json();

      return {
        success: true,
        data: data.data || data,
        total: data.data?.length || data.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch districts data"
      };
    }
  }, {
    params: t.Object({
      cityId: t.String()
    }),
    detail: {
      tags: ["Indonesian Postal Code"],
      summary: "Get districts by city ID"
    }
  })

  .get("/villages/:districtId", async ({ params }) => {
    const { districtId } = params;

    try {
      const response = await fetch(`https://wilayah.id/api/villages/${districtId}.json`);
      const data = await response.json();

      return {
        success: true,
        data: data.data || data,
        total: data.data?.length || data.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch villages data"
      };
    }
  }, {
    params: t.Object({
      districtId: t.String()
    }),
    detail: {
      tags: ["Indonesian Postal Code"],
      summary: "Get villages by district ID"
    }
  })

  .post("/cari-kode-pos", async ({ body }) => {
    const { kode_pos } = body;

    try {
      const response = await fetch(`https://api.lincah.id/api/check/zipcode`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ search: kode_pos })
      });
      const data = await response.json();

      console.log(data)

      return {
        success: true,
        data: data.data || data,
        total: data.data?.length || data.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to search postal code"
      };
    }
  }, {
    body: t.Object({
      kode_pos: t.String()
    }),
    detail: {
      tags: ["Indonesian Postal Code"],
      summary: "Search postal code by location name"
    }
  })