import { createElysia } from "@/libs/elysia";
import { t } from "elysia";
import { ethers } from "ethers";

interface WalletInfo {
  address: string;
  balance: string;
  balanceInEth: string;
  network: string;
  chainId: number;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

interface TransactionDetails {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  blockNumber: number | null;
  blockHash: string | null;
  timestamp?: number;
  confirmations: number;
  status?: number;
}

// Get provider for specified network
function getProvider(network: string = "ethereum"): ethers.JsonRpcProvider {
  const rpcUrls: Record<string, string> = {
    ethereum: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    polygon: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  };

  const rpcUrl = rpcUrls[network.toLowerCase()] || rpcUrls.ethereum;
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Verify signature using ethers.js
async function verifySignature(message: string, signature: string, expectedAddress: string): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}

// Fetch NFT metadata from URI (IPFS or HTTP)
async function fetchNFTMetadata(uri: string): Promise<NFTMetadata | null> {
  try {
    // Handle IPFS URIs
    if (uri.startsWith("ipfs://")) {
      uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    const response = await fetch(uri, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

export default createElysia()
  .get("/", async () => {
    return {
      message: "Web3/Blockchain Integration API",
      endpoints: {
        walletInfo: "GET /wallet/:address - Get wallet information",
        verifySignature: "POST /verify-signature - Verify wallet signature",
        nftMetadata: "GET /nft/:contract/:tokenId - Get NFT metadata",
        gasPrice: "GET /gas-price?network=ethereum - Get current gas prices",
      },
      supportedNetworks: [
        "Ethereum",
        "Polygon",
        "BSC (Binance Smart Chain)",
        "Arbitrum",
        "Optimism",
      ],
      recommendations: {
        libraries: [
          "ethers.js - Ethereum library and wallet implementation",
          "web3.js - Ethereum JavaScript API",
          "viem - TypeScript-first Ethereum library",
          "wagmi - React hooks for Ethereum",
        ],
        services: [
          "Alchemy - Blockchain development platform",
          "Infura - Ethereum API",
          "Moralis - Web3 development platform",
          "QuickNode - Blockchain infrastructure",
        ],
        tools: [
          "WalletConnect - Connect wallets to dApps",
          "RainbowKit - Wallet connection UI",
          "MetaMask - Browser extension wallet",
        ],
      },
      note: "Install ethers.js: npm install ethers",
    };
  }, {
    detail: {
      tags: ["Web3"],
      summary: "Web3 API Information",
    },
  })

  .get("/wallet/:address", async ({ params, query }) => {
    const { address } = params;
    const { network = "ethereum" } = query;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        success: false,
        error: "Invalid Ethereum address format",
      };
    }

    try {
      const provider = getProvider(network);
      const balance = await provider.getBalance(address);
      const networkInfo = await provider.getNetwork();

      const walletInfo: WalletInfo = {
        address,
        balance: balance.toString(),
        balanceInEth: ethers.formatEther(balance),
        network: network,
        chainId: Number(networkInfo.chainId),
      };

      return {
        success: true,
        data: walletInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch wallet information",
      };
    }
  }, {
    params: t.Object({
      address: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
    }),
    query: t.Object({
      network: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Get wallet information",
      description: "Retrieves balance and information for an Ethereum address",
    },
  })

  .post("/verify-signature", async ({ body }) => {
    const { message, signature, address } = body;

    try {
      const isValid = await verifySignature(message, signature, address);

      return {
        success: true,
        valid: isValid,
        address,
        message: isValid ? "Signature verified successfully" : "Invalid signature",
      };
    } catch (error: any) {
      return {
        success: false,
        valid: false,
        error: error.message || "Failed to verify signature",
      };
    }
  }, {
    body: t.Object({
      message: t.String(),
      signature: t.String(),
      address: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Verify wallet signature",
      description: "Verifies a signed message from a wallet (for authentication)",
    },
  })

  .get("/nft/:contract/:tokenId", async ({ params, query }) => {
    const { contract, tokenId } = params;
    const { network = "ethereum" } = query;

    // Validate contract address
    if (!/^0x[a-fA-F0-9]{40}$/.test(contract)) {
      return {
        success: false,
        error: "Invalid contract address",
      };
    }

    try {
      const provider = getProvider(network);

      // ERC-721 ABI for tokenURI function
      const erc721Abi = [
        "function tokenURI(uint256 tokenId) view returns (string)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function ownerOf(uint256 tokenId) view returns (address)",
      ];

      const nftContract = new ethers.Contract(contract, erc721Abi, provider);

      // Fetch basic contract info
      const [tokenURI, name, symbol, owner] = await Promise.allSettled([
        nftContract.tokenURI(tokenId),
        nftContract.name(),
        nftContract.symbol(),
        nftContract.ownerOf(tokenId),
      ]);

      let metadata: NFTMetadata | null = null;

      // Fetch metadata from tokenURI if available
      if (tokenURI.status === "fulfilled" && tokenURI.value) {
        metadata = await fetchNFTMetadata(tokenURI.value);
      }

      return {
        success: true,
        data: {
          contract,
          tokenId,
          network,
          contractInfo: {
            name: name.status === "fulfilled" ? name.value : "Unknown",
            symbol: symbol.status === "fulfilled" ? symbol.value : "Unknown",
          },
          owner: owner.status === "fulfilled" ? owner.value : null,
          tokenURI: tokenURI.status === "fulfilled" ? tokenURI.value : null,
          metadata: metadata || {
            note: "Metadata not available or invalid tokenURI",
          },
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch NFT metadata",
      };
    }
  }, {
    params: t.Object({
      contract: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
      tokenId: t.String(),
    }),
    query: t.Object({
      network: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Get NFT metadata",
      description: "Retrieves metadata for an NFT token from ERC-721 contract",
    },
  })

  .get("/gas-price", async ({ query }) => {
    const { network = "ethereum" } = query;

    try {
      const provider = getProvider(network);
      const feeData = await provider.getFeeData();

      return {
        success: true,
        network,
        data: {
          gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") : null,
          maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, "gwei") : null,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei") : null,
          unit: "Gwei",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch gas prices",
      };
    }
  }, {
    query: t.Object({
      network: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Get current gas prices",
      description: "Retrieves current gas prices for specified network (EIP-1559)",
    },
  })

  .get("/transaction/:txHash", async ({ params, query }) => {
    const { txHash } = params;
    const { network = "ethereum" } = query;

    // Validate transaction hash
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return {
        success: false,
        error: "Invalid transaction hash",
      };
    }

    try {
      const provider = getProvider(network);
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash),
      ]);

      if (!tx) {
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      // Get block timestamp if transaction is mined
      let timestamp;
      if (tx.blockNumber) {
        const block = await provider.getBlock(tx.blockNumber);
        timestamp = block?.timestamp;
      }

      const txDetails: TransactionDetails = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : "0",
        gasLimit: tx.gasLimit.toString(),
        nonce: tx.nonce,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        timestamp,
        confirmations: await tx.confirmations(),
        status: receipt?.status ?? undefined,
      };

      return {
        success: true,
        data: txDetails,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch transaction",
      };
    }
  }, {
    params: t.Object({
      txHash: t.String({ pattern: "^0x[a-fA-F0-9]{64}$" }),
    }),
    query: t.Object({
      network: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Get transaction details",
      description: "Retrieves details for a blockchain transaction including confirmations and status",
    },
  })

  .get("/ens/:name", async ({ params }) => {
    const { name } = params;

    try {
      const provider = getProvider("ethereum"); // ENS is on Ethereum mainnet
      const address = await provider.resolveName(name);

      if (!address) {
        return {
          success: false,
          error: "ENS name not found or not registered",
        };
      }

      // Try to get reverse resolution
      let reverseName = null;
      try {
        reverseName = await provider.lookupAddress(address);
      } catch (e) {
        // Reverse resolution failed, continue without it
      }

      return {
        success: true,
        data: {
          name,
          address,
          reverseName,
          verified: reverseName?.toLowerCase() === name.toLowerCase(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to resolve ENS name",
      };
    }
  }, {
    params: t.Object({
      name: t.String(),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Resolve ENS name",
      description: "Resolves an Ethereum Name Service (ENS) name to an address and performs reverse lookup",
    },
  })

  .get("/ens-reverse/:address", async ({ params }) => {
    const { address } = params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return {
        success: false,
        error: "Invalid Ethereum address format",
      };
    }

    try {
      const provider = getProvider("ethereum");
      const ensName = await provider.lookupAddress(address);

      if (!ensName) {
        return {
          success: false,
          error: "No ENS name found for this address",
        };
      }

      // Verify forward resolution
      const resolvedAddress = await provider.resolveName(ensName);

      return {
        success: true,
        data: {
          address,
          ensName,
          verified: resolvedAddress?.toLowerCase() === address.toLowerCase(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to perform reverse ENS lookup",
      };
    }
  }, {
    params: t.Object({
      address: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
    }),
    detail: {
      tags: ["Web3"],
      summary: "Reverse ENS lookup",
      description: "Looks up the ENS name for an Ethereum address",
    },
  });
