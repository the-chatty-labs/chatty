import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Markdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const chatContainer = useRef<HTMLDivElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const last4Messages = messages.slice(-4);

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: "" },
      ]);

      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: last4Messages,
          docContent: fileContent,
        }),
      }).then(async (response) => {
        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages[newMessages.length - 1].content += chunk;
            return newMessages;
          });
        }
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    }
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
      <div className="meta flex justify-between"></div>

      <div className="mb-12 mt-6">
        <div className="toolbar">
          <input
            type="file"
            className="file-input file-input-ghost"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex items-stretch">
          <textarea
            className="flex-1 textarea"
            name="message"
            id="message"
            rows={5}
            placeholder="Type your message here..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                if (currentMessage.trim().length > 0) {
                  sendMessage();
                }
              }
            }}
          ></textarea>
          <button className="btn h-full" onClick={sendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
