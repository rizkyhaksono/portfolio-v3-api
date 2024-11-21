import { createElysia } from "@/lib/elysia";
import {
  getAllProject,
  createProject,
  getProjectById,
  updateProject,
  deleteProject
} from "./controller/project";
import {
  createWork,
  getAllWork
} from "./controller/work";
import {
  createEducation
} from "./controller/education";

const apiRoutes = createElysia({ prefix: "/v3" })
  .group("/project", (api) =>
    api
      .use(createProject)
      .use(getAllProject)
      .use(getProjectById)
      .use(updateProject)
      .use(deleteProject)
  )
  .group("/work", (api) =>
    api
      .use(createWork)
      .use(getAllWork)
  )
  .group("/education", (api) =>
    api
      .use(createEducation)
  );

export default apiRoutes;