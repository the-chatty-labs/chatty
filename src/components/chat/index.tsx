import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const fetchChatResponse = async (messages: Message[]) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: messages }),
  });
  return response.json();
};

export default function Chat() {
  const [respMeta, setRespMeta] = useState<Record<string, any> | null>(null);
  const [respUsage, setRespUsage] = useState<Record<string, any> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const chatContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const last4Messages = messages.slice(-4);
      fetchChatResponse(last4Messages).then((response) => {
        console.log(response);
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: response.message },
        ]);
        setRespMeta(response.meta);
        setRespUsage(response.usage);
      });
    }
  }, [messages]);

  useLayoutEffect(() => {
    chatContainer.current?.scrollTo({
      top: chatContainer.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = () => {
    console.log(currentMessage);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: currentMessage },
    ]);
    setCurrentMessage("");
  };

  return (
    <div className="flex flex-col h-screen container mx-auto align-center">
      <header className="flex my-6">
        <h1 className="text-2xl font-bold">Chat</h1>
      </header>

      <div
        id="chat"
        ref={chatContainer}
        className="flex flex-col h-full border border-gray-200 overflow-y-auto"
      >
        {messages.map((message, index) => (
          <div
            className={`p-4 flex flex-col ${
              message.role === "user"
                ? "bg-gray-200 text-right items-end"
                : "bg-white text-left items-start"
            }`}
            key={index}
          >
            <p className="font-bold">{message.role}</p>
            <div className="prose">
              <Markdown>{message.content}</Markdown>
            </div>
          </div>
        ))}
      </div>
      <div className="meta flex justify-between">
        {respMeta ? (
          <>
            <p>
              {(respMeta.eval_count / respMeta.eval_duration) * 10e9} token/s{" "}
            </p>
          </>
        ) : null}
        {respUsage ? (
          <>
            <p>{respUsage.total_tokens} token used</p>
          </>
        ) : null}
      </div>

      <div className="flex mb-12 mt-6">
        <textarea
          className="flex-1 textarea"
          name="message"
          id="message"
          rows={5}
          placeholder="Type your message here..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        ></textarea>
        <button className="btn h-full" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
