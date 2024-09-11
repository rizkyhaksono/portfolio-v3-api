import { env } from "./env";
import { logger } from "./logger";
import { Elysia, type ElysiaConfig } from "elysia";

const baseElysia = <
  const BasePath extends string = "",
  const Scoped extends boolean = false
>(
  config?: ElysiaConfig<BasePath, Scoped>
) => new Elysia(config).use(env).use(logger);

const createElysia = (config?: Parameters<typeof baseElysia>[0]) =>
  new Elysia(config);

export { baseElysia, createElysia };
