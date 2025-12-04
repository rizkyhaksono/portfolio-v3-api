import pino from "pino";

const lokiHost = Bun.env.LOKI_HOST;
const lokiUsername = Bun.env.LOKI_USERNAME;
const lokiPassword = Bun.env.LOKI_PASSWORD;

const logger = pino({
  level: Bun.env.NODE_ENV === "production" ? "info" : "debug",
  transport: lokiHost
    ? {
      target: "pino-loki",
      options: {
        batching: true,
        interval: 5,
        host: lokiHost,
        basicAuth: lokiUsername && lokiPassword
          ? {
            username: lokiUsername,
            password: lokiPassword,
          }
          : undefined,
        labels: {
          application: "portfolio-v3-api",
          environment: Bun.env.NODE_ENV || "development",
        },
      },
    }
    : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
});

export default logger;
