interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to Memorium",
    body: "This is a private archive — not a live account. Every message and photo here is a preserved memory.",
  },
  {
    title: "Gather their digital life",
    body: "Import exports from Facebook, Instagram, email, WhatsApp, and text messages. Everything stays on your machine.",
  },
  {
    title: "Explore with care",
    body: "Browse by source to see memories in familiar apps. Use Ask for reflective Q&A — grounded in their words, never impersonation.",
  },
];

export function OnboardingModal({ onComplete }: Props) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="modal-card onboarding-card">
        <h2 id="onboard-title">Getting started</h2>
        <div className="onboarding-steps">
          {STEPS.map((step, i) => (
            <div key={step.title} className="onboarding-step">
              <span className="onboarding-num">{i + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="modal-btn" onClick={onComplete}>
          Begin exploring
        </button>
      </div>
    </div>
  );
}
