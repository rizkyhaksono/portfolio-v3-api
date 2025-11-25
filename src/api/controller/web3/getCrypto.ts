import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import logger from "@/libs/lokiLogger";

export default createElysia()
  .get(
    "/crypto/price",
    async ({
      query
    }: {
      query: { coins?: string };
    }) => {
      const { coins = "bitcoin,ethereum" } = query;
      const apiKey = Bun.env.COINGECKO_API_KEY;

      try {
        // Use Pro API if API key is available, otherwise use free API
        const baseUrl = apiKey
          ? "https://pro-api.coingecko.com/api/v3"
          : "https://api.coingecko.com/api/v3";

        const headers: HeadersInit = {};
        if (apiKey) {
          headers["x-cg-pro-api-key"] = apiKey;
        }

        const response = await fetch(
          `${baseUrl}/simple/price?ids=${coins}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
          { headers }
        );

        if (!response.ok) throw new Error("Failed to fetch crypto prices");

        return {
          status: 200,
          message: "Success",
          data: await response.json(),
        };
      } catch (error) {
        logger.error({
          message: "Failed to fetch crypto prices",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    {
      query: t.Object({
        coins: t.Optional(t.String({ default: "bitcoin,ethereum" })),
      }),
      detail: {
        tags: ["Web3"],
        summary: "Get cryptocurrency prices",
        description:
          "Get real-time prices for cryptocurrencies (bitcoin, ethereum, etc.)",
      },
    }
  )
  .get(
    "/crypto/:coin/chart",
    async ({
      params,
      query
    }: {
      params: { coin: string };
      query: { days?: number };
    }) => {
      const { coin } = params;
      const { days = 7 } = query;
      const apiKey = Bun.env.COINGECKO_API_KEY;

      try {
        const baseUrl = apiKey
          ? "https://pro-api.coingecko.com/api/v3"
          : "https://api.coingecko.com/api/v3";

        const headers: HeadersInit = {};
        if (apiKey) {
          headers["x-cg-pro-api-key"] = apiKey;
        }

        const response = await fetch(
          `${baseUrl}/coins/${coin}/market_chart?vs_currency=usd&days=${days}`,
          { headers }
        );

        if (!response.ok) throw new Error("Failed to fetch chart data");

        const data = await response.json();

        return {
          status: 200,
          message: "Success",
          data: {
            coin,
            days,
            prices: data.prices,
            market_caps: data.market_caps,
            total_volumes: data.total_volumes,
          },
        };
      } catch (error) {
        logger.error({
          message: "Failed to fetch crypto chart",
          coin,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    {
      params: t.Object({
        coin: t.String(),
      }),
      query: t.Object({
        days: t.Optional(
          t.Number({
            minimum: 1,
            maximum: 365,
            default: 7,
          })
        ),
      }),
      detail: {
        tags: ["Web3"],
        summary: "Get cryptocurrency chart data",
        description:
          "Get historical price chart data for a cryptocurrency",
      },
    }
  )
  .get(
    "/crypto/trending",
    async () => {
      const apiKey = Bun.env.COINGECKO_API_KEY;

      try {
        const baseUrl = apiKey
          ? "https://pro-api.coingecko.com/api/v3"
          : "https://api.coingecko.com/api/v3";

        const headers: HeadersInit = {};
        if (apiKey) {
          headers["x-cg-pro-api-key"] = apiKey;
        }

        const response = await fetch(`${baseUrl}/search/trending`, {
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch trending coins");
        }

        const data = await response.json();

        return {
          status: 200,
          message: "Success",
          data: data.coins || [],
        };
      } catch (error) {
        logger.error({
          message: "Failed to fetch trending coins",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    {
      detail: {
        tags: ["Web3"],
        summary: "Get trending cryptocurrencies",
        description: "Get list of trending cryptocurrencies",
      },
    }
  )
  .get(
    "/gas",
    async ({
      query
    }: {
      query: { network?: string };
    }) => {
      const { network = "ethereum" } = query;
      const apiKey = Bun.env.ETHERSCAN_API_KEY || "YourApiKeyToken";

      try {
        let gasPrice;

        if (network === "ethereum") {
          // Using Etherscan API V2 for gas prices
          const response = await fetch(
            `https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle&apikey=${apiKey}`
          );

          if (response.ok) {
            const data = await response.json();
            gasPrice = data.result;
          }
        }

        return {
          status: 200,
          message: "Success",
          data: {
            network,
            gasPrice,
          },
        };
      } catch (error) {
        logger.error({
          message: "Failed to fetch gas prices",
          network,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    {
      query: t.Object({
        network: t.Optional(t.String({ default: "ethereum" })),
      }),
      detail: {
        tags: ["Web3"],
        summary: "Get network gas prices",
        description: "Get current gas prices for blockchain networks",
      },
    }
  );