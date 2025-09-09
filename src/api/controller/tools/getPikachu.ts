import { createElysia } from "@/libs/elysia";

export default createElysia()
  .get("/pikachu/random", async () => {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon/pikachu");
    const data = await res.json();
    return {
      status: 200,
      message: "Success",
      result: data.sprites,
    };
  }, {
    detail: {
      tags: ["Pikachu"],
    }
  })