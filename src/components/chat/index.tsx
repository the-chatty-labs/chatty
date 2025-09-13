import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const chatContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const last4Messages = messages.slice(-4);
      fetchChatResponse(last4Messages).then((response) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: "assistant", content: response.message },
        ]);
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
            className={`p-4 ${
              message.role === "user"
                ? "bg-gray-200 text-right"
                : "bg-white text-left"
            }`}
            key={index}
          >
            <p className="font-bold">{message.role}</p>
            <p>{message.content}</p>
          </div>
        ))}
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
        <button className="btn" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
