import React, { useState, useRef, useEffect } from "react";

const FONT_LINK_ID = "plex-font-link";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

const STATUS = {
  OPEN: { label: "Open", bg: "#FDF0E1", fg: "#B87A1E", dot: "#D9922A" },
  RESOLVED: { label: "Resolved", bg: "#E4F3EC", fg: "#1F7A5C", dot: "#1F7A5C" },
  ESCALATED: { label: "Escalated to Tier 2", bg: "#FBEAE5", fg: "#B3452C", dot: "#B3452C" },
};

const SYSTEM_PROMPT = `You are Tier 1 IT Helpdesk Assistant, a triage bot for a service desk supporting end users across enterprise, medical, and government-adjacent environments.

Your job:
1. Help with common Tier 1 issues: password resets, VPN connectivity, printer problems, Wi-Fi/network connectivity, email access, and basic Active Directory account lockouts.
2. Ask short, specific clarifying questions before assuming a fix (e.g. error message text, OS, whether it's wired or wireless).
3. Give clear numbered steps, one troubleshooting path at a time — don't dump every possible fix at once.
4. If a fix works, confirm resolution briefly and warmly.
5. If the issue is outside Tier 1 scope (hardware failure, server-side outage, account provisioning changes, anything requiring physical intervention or admin escalation) or if standard fixes don't resolve it after 2 attempts, say clearly: "This needs to be escalated to Tier 2." and provide a one-paragraph handoff summary: what the user reported, what was already tried, and what Tier 2 should check next.
6. Keep responses concise — this is a chat window, not a document. No markdown headers, plain short paragraphs and numbered lists only.
7. Stay professional and calm regardless of user frustration; never make up steps you're not confident about.

Start every new conversation by asking what issue the user is running into, unless they've already stated it.`;

function TicketBadge({ status }) {
  const s = STATUS[status];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.fg,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.03em",
        padding: "4px 10px",
        borderRadius: 4,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label.toUpperCase()}
    </div>
  );
}

export default function ITHelpdeskAssistant() {
  useFonts();
  const ticketId = useRef(
    "IT-2026-" + Math.floor(1000 + Math.random() * 9000)
  ).current;

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, this is the Tier 1 helpdesk. What issue are you running into today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("OPEN");
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      const reply = data.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("\n")
        .trim();

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      if (/escalat/i.test(reply)) {
        setStatus("ESCALATED");
      } else if (/glad (that|it)|resolved|all set|you're good|you should be good/i.test(reply)) {
        setStatus("RESOLVED");
      }
    } catch (e) {
      setError("Something went wrong reaching the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetTicket() {
    setMessages([
      {
        role: "assistant",
        content:
          "Hi, this is the Tier 1 helpdesk. What issue are you running into today?",
      },
    ]);
    setStatus("OPEN");
    setError(null);
  }

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
        background: "#F5F6F8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px",
        color: "#20242C",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        {/* Header / ticket bar */}
        <div
          style={{
            background: "#1F3864",
            borderRadius: "10px 10px 0 0",
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                color: "#B7C4E0",
                letterSpacing: "0.05em",
              }}
            >
              TICKET #{ticketId}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#FFFFFF", marginTop: 2 }}>
              Tier 1 IT Helpdesk Assistant
            </div>
          </div>
          <TicketBadge status={status} />
        </div>

        {/* Chat body */}
        <div
          ref={scrollRef}
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDE1E8",
            borderTop: "none",
            height: 440,
            overflowY: "auto",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  background: m.role === "user" ? "#1F3864" : "#F0F2F5",
                  color: m.role === "user" ? "#FFFFFF" : "#20242C",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  background: "#F0F2F5",
                  padding: "10px 14px",
                  borderRadius: 10,
                  fontSize: 14.5,
                  color: "#6B7280",
                }}
              >
                Typing…
              </div>
            </div>
          )}
          {error && (
            <div style={{ color: "#B3452C", fontSize: 13.5 }}>{error}</div>
          )}
        </div>

        {/* Input bar */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDE1E8",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            padding: 14,
            display: "flex",
            gap: 8,
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your issue…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid #DDE1E8",
              borderRadius: 8,
              padding: "10px 12px",
              fontFamily: "inherit",
              fontSize: 14.5,
              outline: "none",
              color: "#20242C",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "#AAB4C6" : "#1F3864",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || !input.trim() ? "default" : "pointer",
            }}
          >
            Send
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 12.5, color: "#8A93A3" }}>
            Prototype Tier 1 triage assistant — for demonstration purposes.
          </span>
          <button
            onClick={resetTicket}
            style={{
              background: "none",
              border: "none",
              color: "#1F3864",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Start new ticket
          </button>
        </div>
      </div>
    </div>
  );
}
