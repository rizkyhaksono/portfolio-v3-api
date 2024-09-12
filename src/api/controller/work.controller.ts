import { t } from "elysia";
import { prismaClient } from "@/lib/prismaDatabase";
import { createElysia } from "@/lib/elysia";
import { cloudinary, FileToString } from "@/lib/cloudinary";

export const WorkController = createElysia()
  .model({
    "work.model": t.Object({
      logo: t.File(),
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
      data: await prismaClient.work.findMany(),
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
      data: await prismaClient.work.findUnique({
        where: {
          id: parseInt(id),
        },
      }),
    };
  },
    {
      detail: {
        tags: ["Works"]
      }
    }
  )
  .post("/", async ({ body }) => {
    // const images = document.getElementById('images') as HTMLInputElement
    // const file = FileToString(body.logo)
    // const upLogo = await cloudinary.uploader.upload(body.logo.toString(), {
    //   upload_preset: "elysia",
    // })
    // console.log(images.files)
    // console.log(file)

    return await prismaClient.work.create({
      data: { ...body },
    })
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
  .patch("/:id", async ({ params: { id }, body: {
    ...body
  } }) => {
    const updateData = prismaClient.work.update({
      where: {
        id: parseInt(id),
      },
      data: {
        ...body
      }
    })
    return {
      status: 200,
      message: updateData,
    }
  },
    {
      detail: {
        tags: ["Works"]
      },
      body: "work.model",
    }
  )