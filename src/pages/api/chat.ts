import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url }) => {
  const message = url.searchParams.get("message") ?? "";
  console.log("message:", message);
  if (!message) {
    return new Response(
      JSON.stringify({ error: 'Missing "message" query param' }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const chat = new ChatOllama({
    model: "llama3.2",
    temperature: 0,
    // baseUrl: process.env.OLLAMA_BASE_URL, // e.g. "http://localhost:11434"
  });

  try {
    const messages = await chat.invoke([
      new SystemMessage("You are a helpful assistant."),
      new HumanMessage(message),
    ]);

    return new Response(JSON.stringify({ message: messages.content }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err: any) {
    console.error("ChatOllama error:", err?.message ?? err);
    return new Response(
      JSON.stringify({
        error: "Model unreachable",
        detail: err?.message ?? String(err),
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const prerender = false;
