import { Elysia, type ElysiaConfig } from "elysia";
import logger from "./logger";
import { error } from "@/utils/errorHandler";
import { env } from "./env";

const baseElysia = <const BasePath extends string = "">(
  config?: ElysiaConfig<BasePath>
) => new Elysia(config).use(env).use(logger).use(error);

const createElysia = (config?: Parameters<typeof baseElysia>[0]) =>
  new Elysia(config) as ReturnType<typeof baseElysia>;

export { createElysia, baseElysia };