import type { APIRoute } from "astro";
import pino, { destination } from "pino";
import pretty from "pino-pretty";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

const transport = pino.transport({
  targets: [
    {
      target: "pino-pretty",
      options: { colorize: false, destination: "./debug.log" },
    },
  ],
});

const logger = pino(transport);

const chatSchema = z.array(
  z.object({
    role: z.string().refine((role) => role === "user" || role === "assistant"),
    content: z.string(),
  })
);

export const POST: APIRoute = async ({ request }) => {
  const req = await request.json();
  logger.info(req);
  if (!chatSchema.safeParse(req.messages).success) {
    return new Response(JSON.stringify({ error: 'Missing "messages"' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msgs = req.messages as z.infer<typeof chatSchema>;

  const model = new ChatOllama({
    model: "llama3.2",
    temperature: 0,
    // baseUrl: process.env.OLLAMA_BASE_URL, // e.g. "http://localhost:11434"
  });

  try {
    const stream = await model.stream([
      new SystemMessage("You are a helpful assistant."),
      ...msgs.map((m) =>
        m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
      ),
    ]);

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          if (chunk.content) {
            controller.enqueue(encoder.encode(chunk.content as string));
          }
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    logger.error(`ChatOllama error: ${err?.message ?? err}`);
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
