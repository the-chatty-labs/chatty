import type { APIRoute } from "astro";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

const chatSchema = z.array(
  z.object({
    role: z.string().refine((role) => role === "user" || role === "assistant"),
    content: z.string(),
  })
);

export const POST: APIRoute = async ({ request }) => {
  const req = await request.json();
  console.log("request:", req);
  if (!chatSchema.safeParse(req.messages).success) {
    return new Response(JSON.stringify({ error: 'Missing "messages"' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msgs = req.messages as z.infer<typeof chatSchema>;

  const chat = new ChatOllama({
    model: "llama3.2",
    temperature: 0,
    // baseUrl: process.env.OLLAMA_BASE_URL, // e.g. "http://localhost:11434"
  });

  try {
    const messages = await chat.invoke([
      new SystemMessage("You are a helpful assistant."),
      ...msgs.map((m) =>
        m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
      ),
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
