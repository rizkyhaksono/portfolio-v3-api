import { createElysia } from "@/libs/elysia";
import getCrypto from "./getCrypto";

/**
 * Web3 endpoints for real-time cryptocurrency data
 * Simplified to only include crypto price charts
 */
export default createElysia({ prefix: "/web3" })
  .use(getCrypto);
