import { createElysia } from "@/libs/elysia";
import { listTasks } from "@/libs/trackerStore";

/** Public: anyone can view the board (no auth). */
export default createElysia().get(
  "/",
  async () => {
    const data = await listTasks();
    return { status: 200, message: "Success", data };
  },
  {
    detail: {
      tags: ["Tracker"],
      summary: "List tracker tasks (public)",
      description: "Public Kanban board — returns all tasks. No auth required.",
    },
  },
);
