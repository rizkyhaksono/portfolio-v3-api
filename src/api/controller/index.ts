import { createElysia } from "@/lib/elysia";
import { WorkController } from "./work.controller";
import { projectController } from "./project.controller";

const apiRoutes = createElysia({ prefix: "api/v3/" })
  .group("work", (api) => api.use(WorkController))
  .group("project", (api) => api.use((projectController)))

export default apiRoutes;