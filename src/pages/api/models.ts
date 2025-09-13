import type { APIRoute } from "astro";
import ky from "ky";

export const GET: APIRoute = async ({ request }) => {
  const models = await ky.get("http://localhost:11434/api/tags").json();

  return new Response(JSON.stringify(models));
};
