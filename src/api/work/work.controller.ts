import { t } from "elysia";
import { WorkService } from "./work.service";
import { createElysia } from "../../lib/elysia";
import { WorkRequest } from "./work.schema";

const workService = new WorkService();

export const WorkController = createElysia()
  .model({
    "work.model": t.Object({
      logo: t.String(),
      jobTitle: t.String(),
      content: t.String(),
      instance: t.String(),
      instanceLink: t.String(),
      address: t.String(),
      duration: t.String(),
    }),
  })
  .get("/", async () => {
    return {
      status: 200,
      data: await workService.getAllWork()
    };
  },
    {
      detail: {
        tags: ["Works"],
      }
    }
  )
  .get("/:id", async ({ params: { id } }) => {
    return {
      status: 200,
      data: await workService.getWorkById(parseInt(id)),
    };
  },
    {
      detail: {
        tags: ["Works"]
      }
    }
  )
  .post("/", async ({ body }: { body: any }) => {
    return await workService.createWork({
      ...body,
    });
  },
    {
      detail: {
        tags: ["Works"]
      },
      body: "work.model",
      response: t.Object({
        id: t.Number(),
        logo: t.String(),
        jobTitle: t.String(),
        content: t.String(),
        instance: t.String(),
        instanceLink: t.String(),
        address: t.String(),
        duration: t.String(),
      })
    }
  )
  .patch("/:id", async ({ params: { id }, body }: { params: { id: string }; body: any }) => {
    await workService.updateWorkById(parseInt(id), {
      ...body,
    });
    return {
      status: 200,
      message: "Work update successfully",
    }
  },
    {
      detail: {
        tags: ["Works"]
      },
      body: "work.model",
    }
  )