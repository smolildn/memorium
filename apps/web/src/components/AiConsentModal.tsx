interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function AiConsentModal({ onAccept, onDecline }: Props) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title">
      <div className="modal-card">
        <h2 id="ai-consent-title">Before you ask</h2>
        <p>
          Reflective Q&amp;A sends your question and relevant archive excerpts to an AI provider
          (OpenAI when configured). Your full vault is <strong>not</strong> uploaded — only
          retrieved snippets.
        </p>
        <ul className="consent-list">
          <li>Responses are grounded in imported sources with citations</li>
          <li>The AI does not impersonate your loved one</li>
          <li>You can decline and browse memories without AI</li>
        </ul>
        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn--ghost" onClick={onDecline}>
            Not now
          </button>
          <button type="button" className="modal-btn" onClick={onAccept}>
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}
