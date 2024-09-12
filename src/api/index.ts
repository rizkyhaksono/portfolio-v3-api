import { createElysia } from "../lib/elysia";
import { WorkController } from "./work/work.controller";

const apiRoutes = createElysia({ prefix: "api/v3/" })
  .group("work", (api) => api.use(WorkController))

export default apiRoutes;