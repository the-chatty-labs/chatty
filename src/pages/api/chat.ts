import type { APIRoute } from "astro";
import pino, { destination } from "pino";
import pretty from "pino-pretty";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
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

const model = new ChatOllama({
  model: "llama3.2",
  temperature: 0,
});

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
});
const vectorStore = new MemoryVectorStore(embeddings);

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const chatSchema = z.array(
  z.object({
    role: z.string().refine((role) => role === "user" || role === "assistant"),
    content: z.string(),
  })
);

const requestBodySchema = z.object({
  messages: chatSchema,
  docContent: z.string().optional().nullable(),
});

export const POST: APIRoute = async ({ request }) => {
  const req = await request.json();
  logger.info(req);
  const parseResult = requestBodySchema.safeParse(req);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const reqBody = parseResult.data;

  const msgs = reqBody.messages;
  const docContent = reqBody.docContent;
  const hasDocContent = docContent && docContent.trim().length > 0;

  let docsText = "";
  if (hasDocContent) {
    console.log("docContent", docContent.length);

    const docs = await splitter.createDocuments(
      [docContent],
      [{ source: "user" }]
    );
    await vectorStore.addDocuments(docs);
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role === "user") {
      const retriever = vectorStore.asRetriever();
      const retrievedDocs = await retriever.invoke(lastMsg.content);
      console.log("retrievedDocs", retrievedDocs);
      // Combine the documents into a single string
      docsText = retrievedDocs.map((d) => d.pageContent).join("");
      console.log("docsText", docsText);
    }
  }

  try {
    const systemPrompt = `You are an assistant for question-answering tasks.`;
    const systemPromptWithContext = `You are an assistant for question-answering tasks.
Use the following pieces of retrieved context to answer the question.
If you don't know the answer, just say that you don't know.
Use three sentences maximum and keep the answer concise.
Context: {context}:`;
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", hasDocContent ? systemPromptWithContext : systemPrompt],
      new MessagesPlaceholder("msgs"),
    ]);

    let promptValue;
    if (hasDocContent) {
      promptValue = await promptTemplate.invoke({ msgs, context: docsText });
    } else {
      promptValue = await promptTemplate.invoke({ msgs });
    }
    console.log(promptValue);

    const stream = await model.stream(promptValue);

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
