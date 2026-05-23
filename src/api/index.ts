import { createElysia } from "@/libs/elysia";
import {
  signup,
  login,
  logout,
  provider,
  providerCallback,
  requestPasswordReset,
  resetPassword,
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
  getAIChat,
  getAIChatById,
  reindexPortfolio,
} from "./controller/ai";
import {
  getAllBlog,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from "./controller/blog";
import {
  getUser,
  updateUser,
  uploadAvatar,
  uploadBanner,
  deleteAvatar,
  deleteBanner,
  getAvatar,
  getBanner,
} from "./controller/user";
import { getSettings, updateSettings } from "./controller/settings";
import {
  minioUpload,
  minioDownload
} from "./controller/asset";
import {
  getYoutubeDownloader,
  getKodeWilayahPos,
  getAnime,
  getPokemon,
  getSpotify,
  getLinkedIn,
  getDuolingo,
  getJapaneseQuiz,
  getFacebookDownloader,
  getInstagramDownloader,
  getTiktokDownloader,
  getXDownloader,
  getLeetCode,
  getCodeforces,
  getOGImage,
  getNPMPackage,
  getStarWars,
  getQRCode,
  getIPInfo,
  getChess,
} from "./controller/tools";
import { getRSS } from "./controller/rss";
import publicChat from "./controller/public-chat";
import web3 from "./controller/web3";

const apiRoutes = createElysia({ prefix: "/v3" })
  .group("/auth", (api) =>
    api
      .use(signup)
      .use(login)
      .use(logout)
      .use(provider)
      .use(providerCallback)
      .use(requestPasswordReset)
      .use(resetPassword)
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
      .use(getAIChatById)
      .use(reindexPortfolio)
  )
  .group("/blog", (api) =>
    api
      .use(getAllBlog)
      .use(getBlogBySlug)
      .use(createBlog)
      .use(updateBlog)
      .use(deleteBlog)
  )
  .group("/me", (api) =>
    api
      .use(getUser)
      .use(updateUser)
      .use(getSettings)
      .use(updateSettings)
      .use(uploadAvatar)
      .use(uploadBanner)
      .use(deleteAvatar)
      .use(deleteBanner)
      .use(getAvatar)
      .use(getBanner)
  )
  .group("/asset", (api) =>
    api
      .use(minioUpload)
      .use(minioDownload)
  )
  .group("/tools", (api) =>
    api
      .use(getYoutubeDownloader)
      .use(getKodeWilayahPos)
      .use(getAnime)
      .use(getPokemon)
      .use(getFacebookDownloader)
      .use(getInstagramDownloader)
      .use(getTiktokDownloader)
      .use(getXDownloader)
      .use(getLeetCode)
      .use(getCodeforces)
      .use(getOGImage)
      .use(getNPMPackage)
      .use(getStarWars)
      .use(getQRCode)
      .use(getIPInfo)
      .use(getChess)
  )
  .group("/rss", (api) =>
    api.use(getRSS)
  )
  .group("/spotify", (api) =>
    api.use(getSpotify)
  )
  .group("/linkedin", (api) =>
    api.use(getLinkedIn)
  )
  .group("/duolingo", (api) =>
    api.use(getDuolingo)
  )
  .group("/japanese-quiz", (api) =>
    api.use(getJapaneseQuiz)
  )
  .group("/public-chat", (api) =>
    api.use(publicChat)
  )
  .group("/web3", (api) =>
    api.use(web3)
  )

export default apiRoutes;