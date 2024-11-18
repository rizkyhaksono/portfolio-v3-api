import { createElysia } from "@/lib/elysia";
import {
  getAllProject,
  createProject
} from "./controller/project";

const apiRoutes = createElysia({ prefix: "/v3" })
  .group("/project", (api) =>
    api
      .use(getAllProject)
      .use(createProject)
  )

export default apiRoutes;