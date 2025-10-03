import { useEffect, useRef, useState } from "react";

const ChatSimulator = () => {
  const [messages, setMessages] = useState([]);
  const [inputs, setInputs] = useState([
    { text: "", isSender: true, delay: 1000 },
  ]);
  const [chatName, setChatName] = useState("Chottu");
  const chatBoxRef = useRef(null);
  const soundRef = useRef(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayIndex = useRef(0);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (index) => {
    const input = inputs[index];
    if (input.text.trim() !== "") {
      const newMessage = {
        text: input.text,
        isSender: input.isSender,
      };
      setMessages((prev) => [...prev, newMessage]);

      if (soundRef.current && input.isSender) {
        soundRef.current
          .play()
          .catch((error) => console.error("Sound error:", error));
      }

      const newInputs = [...inputs];
      newInputs[index].sent = true;
      if (index === inputs.length - 1) {
        newInputs.push({ text: "", isSender: true, delay: 1000 });
      }
      setInputs(newInputs);
    }
  };

  const handleReplay = () => {
    setMessages([]);
    setIsReplaying(true);
    replayIndex.current = 0;
    replayMessages();
  };

  const replayMessages = () => {
    if (
      replayIndex.current < inputs.length &&
      inputs[replayIndex.current].text.trim() !== ""
    ) {
      const msg = inputs[replayIndex.current];
      setMessages((prev) => [
        ...prev,
        { text: msg.text, isSender: msg.isSender },
      ]);

      if (soundRef.current && msg.isSender) {
        soundRef.current
          .play()
          .catch((error) => console.error("Sound error:", error));
      }

      const delay = msg.delay || 1000;
      replayIndex.current += 1;
      setTimeout(replayMessages, delay);
    } else {
      setIsReplaying(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div
        style={{
          position: "relative",
          width: "380px",
          height: "700px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          overflow: "hidden",
          fontFamily: "Arial",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "15px",
            fontWeight: "bold",
            fontSize: "1.3rem",
            textAlign: "center",
            backgroundColor: "#f1f1f1",
          }}
        >
          <input
            type="text"
            value={chatName}
            onChange={(e) => setChatName(e.target.value)}
            style={{
              fontSize: "1.3rem",
              fontWeight: "bold",
              textAlign: "center",
              border: "none",
              background: "transparent",
              outline: "none",
              width: "100%",
            }}
          />
        </div>

        {/* Chat Box */}
        <div
          ref={chatBoxRef}
          style={{
            padding: "10px",
            height: "calc(100% - 180px)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f7f7f7",
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.isSender ? "flex-end" : "flex-start",
                backgroundColor: msg.isSender ? "#DCF8C6" : "#E5E5EA",
                padding: "10px 15px",
                borderRadius: "10px",
                margin: "5px 0",
                maxWidth: "70%",
                fontSize: "1rem",
              }}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Replay Button */}
        <div
          style={{
            padding: "10px",
            backgroundColor: "#fff",
            textAlign: "center",
          }}
        >
          <button
            onClick={handleReplay}
            disabled={isReplaying}
            style={{
              padding: "10px 20px",
              fontSize: "1rem",
              backgroundColor: "#007BFF",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {isReplaying ? "Replaying..." : "Replay Conversation"}
          </button>
        </div>

        <audio ref={soundRef} src="/message-tone.mp3" preload="auto"></audio>
      </div>

      {/* Text Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {inputs.map((input, index) => (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <input
              type="text"
              value={input.text}
              onChange={(e) => {
                const newInputs = [...inputs];
                newInputs[index].text = e.target.value;
                setInputs(newInputs);
              }}
              placeholder={`Message ${index + 1}`}
              style={{
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                width: "200px",
              }}
            />
            <label>
              <input
                type="checkbox"
                checked={input.isSender}
                onChange={() => {
                  const newInputs = [...inputs];
                  newInputs[index].isSender = !newInputs[index].isSender;
                  setInputs(newInputs);
                }}
              />{" "}
              Sender
            </label>
            <input
              type="number"
              value={input.delay}
              onChange={(e) => {
                const newInputs = [...inputs];
                newInputs[index].delay = parseInt(e.target.value) || 1000;
                setInputs(newInputs);
              }}
              style={{ width: "60px", padding: "5px" }}
              min="0"
              placeholder="ms"
            />
            <button
              onClick={() => handleSend(index)}
              disabled={input.sent}
              style={{
                padding: "8px 12px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSimulator;
