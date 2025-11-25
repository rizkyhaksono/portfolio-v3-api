import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { ethers } from "ethers";
import logger from "@/libs/lokiLogger";

/**
 * Check wallet balance across different networks
 */
export default createElysia()
  .get(
    "/wallet/:address",
    async ({ params: { address }, query }: any) => {
      const { network = "ethereum" } = query;

      try {
        let provider;
        let networkName = network;

        switch (network) {
          case "ethereum":
            provider = new ethers.JsonRpcProvider(
              Bun.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com"
            );
            break;
          case "polygon":
            provider = new ethers.JsonRpcProvider(
              Bun.env.POLYGON_RPC_URL || "https://polygon-rpc.com"
            );
            break;
          case "bsc":
            provider = new ethers.JsonRpcProvider(
              Bun.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org"
            );
            networkName = "bsc";
            break;
          case "arbitrum":
            provider = new ethers.JsonRpcProvider(
              Bun.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"
            );
            break;
          case "optimism":
            provider = new ethers.JsonRpcProvider(
              Bun.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io"
            );
            break;
          default:
            throw new Error("Unsupported network");
        }

        const balance = await provider.getBalance(address);
        const balanceInEther = ethers.formatEther(balance);

        // Get current block
        const blockNumber = await provider.getBlockNumber();

        // Get transaction count
        const txCount = await provider.getTransactionCount(address);

        return {
          status: 200,
          message: "Success",
          data: {
            address,
            network: networkName,
            balance: balanceInEther,
            balanceWei: balance.toString(),
            transactionCount: txCount,
            currentBlock: blockNumber,
          },
        };
      } catch (error) {
        logger.error({
          message: "Failed to fetch wallet balance",
          address,
          network,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        throw error;
      }
    },
    {
      params: t.Object({
        address: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
      }),
      query: t.Object({
        network: t.Optional(
          t.Union([
            t.Literal("ethereum"),
            t.Literal("polygon"),
            t.Literal("bsc"),
            t.Literal("arbitrum"),
            t.Literal("optimism"),
          ])
        ),
      }),
      response: {
        200: t.Object({
          status: t.Number(),
          message: t.String(),
          data: t.Object({
            address: t.String(),
            network: t.String(),
            balance: t.String(),
            balanceWei: t.String(),
            transactionCount: t.Number(),
            currentBlock: t.Number(),
          }),
        }),
      },
      detail: {
        tags: ["Web3"],
        summary: "Check wallet balance",
        description: "Get wallet balance and info across multiple networks",
      },
    }
  )
  .get(
    "/wallet/:address/nft",
    async ({ params: { address }, query }: any) => {
      const { network = "ethereum", limit = 10 } = query;

      try {
        // Using Alchemy NFT API (free tier)
        const alchemyKey = Bun.env.ALCHEMY_API_KEY || "demo";
        let baseUrl;

        switch (network) {
          case "ethereum":
            baseUrl = `https://eth-mainnet.g.alchemy.com/nft/v2/${alchemyKey}`;
            break;
          case "polygon":
            baseUrl = `https://polygon-mainnet.g.alchemy.com/nft/v2/${alchemyKey}`;
            break;
          default:
            throw new Error("NFT lookup not supported for this network");
        }

        const response = await fetch(
          `${baseUrl}/getNFTs?owner=${address}&pageSize=${limit}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch NFTs");
        }

        const data = await response.json();

        return {
          status: 200,
          message: "Success",
          data: {
            address,
            network,
            nfts: data.ownedNfts || [],
            totalCount: data.totalCount || 0,
          },
        };
      } catch (error) {
        logger.error({
          message: "Failed to fetch NFTs",
          address,
          network,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
          status: 200,
          message: "NFT data not available",
          data: {
            address,
            network,
            nfts: [],
            totalCount: 0,
            note: "Configure ALCHEMY_API_KEY for NFT data",
          },
        };
      }
    },
    {
      params: t.Object({
        address: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
      }),
      query: t.Object({
        network: t.Optional(t.Union([t.Literal("ethereum"), t.Literal("polygon")])),
        limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 10 })),
      }),
      detail: {
        tags: ["Web3"],
        summary: "Get wallet NFTs",
        description: "Get NFTs owned by a wallet address",
      },
    }
  );
