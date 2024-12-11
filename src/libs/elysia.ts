import { env } from "./env";
import { Elysia, type ElysiaConfig } from "elysia";
import { error } from "@/utils/errorHandler";
import logger from "./logger";

const baseElysia = <
  const BasePath extends string = "",
  const Scoped extends boolean = false
>(
  config?: ElysiaConfig<BasePath, Scoped>
) => new Elysia(config).use(env).use(logger).use(error);

const createElysia = (config?: Parameters<typeof baseElysia>[0]) =>
  new Elysia(config);

export { baseElysia, createElysia };
