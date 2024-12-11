import { createElysia } from "@/libs/elysia";
import {
  signup,
  login
} from "./controller/auth";
import {
  getAllProject,
  createProject,
  getProjectById,
  updateProject,
  deleteProject
} from "./controller/project";
import {
  createWork,
  getAllWork,
  getWorkById,
  updateWork,
  deleteWork
} from "./controller/work";
import {
  createEducation,
  getAllEducation,
  getEducationById,
  updateEducation,
  deleteEducation
} from "./controller/education";
import {
  requestAIChat
} from "./controller/ai";

const apiRoutes = createElysia({ prefix: "/v3" })
  .group("/auth", (api) =>
    api
      .use(signup)
      .use(login)
  )
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
      .use(getWorkById)
      .use(updateWork)
      .use(deleteWork)
  )
  .group("/education", (api) =>
    api
      .use(createEducation)
      .use(getAllEducation)
      .use(getEducationById)
      .use(updateEducation)
      .use(deleteEducation)
  )
  .group("/ai", (api) =>
    api
      .use(requestAIChat)
  )

export default apiRoutes;