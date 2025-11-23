import { createElysia } from "@/libs/elysia";
import createPost from "./createPost";
import getAllPosts from "./getAllPosts";
import getReplies from "./getReplies";
import updatePost from "./updatePost";
import deletePost from "./deletePost";

export default createElysia({ prefix: "/public-chat" })
  .use(createPost)
  .use(getAllPosts)
  .use(getReplies)
  .use(updatePost)
  .use(deletePost);
