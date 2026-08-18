import { useState } from "react";

import { api, isDemoMode, type ChatResponse } from "../api";

interface Props {
  subjectName: string;
  hasConsent: boolean;
  onNeedConsent: () => void;
  onCitationClick: (itemId: string) => void;
}

const STARTERS = [
  "What did they enjoy cooking?",
  "Tell me about family traditions",
  "What messages did they send about college?",
];

export function ChatPanel({ subjectName, hasConsent, onNeedConsent, onCitationClick }: Props) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const ask = async (q: string) => {
    if (!q.trim()) return;
    if (!hasConsent && !isDemoMode()) {
      onNeedConsent();
      return;
    }
    setLoading(true);
    setAiError(null);
    setResponse(null);
    try {
      const result = await api.chat(q.trim());
      setResponse(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      if (msg.includes("503") || msg.includes("AI not configured")) {
        setAiError(
          "AI is not configured. Set OPENAI_API_KEY in .env and run `npm run cli -- index-ai` to enable reflective Q&A.",
        );
      } else {
        setAiError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-intro">
        <h2>Explore memories</h2>
        {isDemoMode() ? (
          <p>
            AI chat requires the local app with an OpenAI API key. Clone the repo and run{" "}
            <code>npm run poc</code> to enable reflective Q&amp;A.
          </p>
        ) : (
          <p>
            Ask questions about {subjectName}&apos;s archive. Responses are grounded in
            imported sources — this is reflection, not impersonation.
          </p>
        )}
      </div>

      <div className="starters">
        {STARTERS.map((s) => (
          <button
            key={s}
            type="button"
            className="starter-chip"
            onClick={() => {
              setQuestion(s);
              void ask(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <textarea
          rows={3}
          placeholder={`Ask about ${subjectName}…`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={loading || isDemoMode()}>
          {isDemoMode() ? "Requires local app" : loading ? "Thinking…" : "Ask"}
        </button>
      </form>

      {aiError && <div className="ai-notice">{aiError}</div>}

      {response && (
        <div className="chat-response">
          <p>{response.content}</p>
          {response.citations.length > 0 && (
            <div className="citations">
              <h4>From the archive</h4>
              <ul>
                {response.citations.map((c) => (
                  <li key={c.itemId}>
                    <button
                      type="button"
                      className="citation-link"
                      onClick={() => onCitationClick(c.itemId)}
                    >
                      {c.excerpt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
