import { useState } from "react";

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");

  const sendMessage = () => {
    console.log(currentMessage);
    setMessages((prevMessages) => [...prevMessages, currentMessage]);
    setCurrentMessage("");
  };

  return (
    <div>
      <h1>Chat</h1>
      <div id="chat">
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
      <div>
        <textarea
          name="message"
          id="message"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
        ></textarea>
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
