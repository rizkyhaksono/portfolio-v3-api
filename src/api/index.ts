import { createElysia } from "@/libs/elysia";
import {
  signup,
  login,
  logout
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
  requestAIChat,
  getAIChat
} from "./controller/ai";
import {
  getUser,
  updateUser
} from "./controller/user";
import {
  cloudinaryUpload,
  minioUpload,
  minioDownload
} from "./controller/asset";
import {
  getYoutubeDownloader
} from "./controller/tools";

const apiRoutes = createElysia({ prefix: "/v3" })
  .group("/auth", (api) =>
    api
      .use(signup)
      .use(login)
      .use(logout)
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
      .use(getAIChat)
  )
  .group("/me", (api) =>
    api
      .use(getUser)
      .use(updateUser)
  )
  .group("/asset", (api) =>
    api
      .use(cloudinaryUpload)
      .use(minioUpload)
      .use(minioDownload)
  )
  .group("/tools", (api) =>
    api
      .use(getYoutubeDownloader)
  )

export default apiRoutes;