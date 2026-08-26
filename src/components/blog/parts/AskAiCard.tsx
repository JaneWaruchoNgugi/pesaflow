import React from 'react';

// Phase 1: the funnel card is visible; the example prompt opens the sign-up prompt.
// Phase 4 wires this to the existing freeAdvisorAgent using the user's real data.
export const AskAiCard: React.FC<{ examplePrompt: string; onAsk: () => void }> = ({ examplePrompt, onAsk }) => (
  <div style={S.card}>
    <div style={S.inner}>
      <div style={S.title}>Need personalized advice?</div>
      <div style={S.desc}>Ask PesaFlow AI how this article applies to <i>your</i> financial situation.</div>
      <button style={S.ask} onClick={onAsk}>"{examplePrompt}" →</button>
    </div>
  </div>
);

const S: Record<string, React.CSSProperties> = {
  card: { position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0A1628, #1E293B)', borderRadius: 16, padding: 20, margin: '24px 0' },
  inner: { position: 'relative', zIndex: 1 },
  title: { fontFamily: 'Cormorant Garamond, serif', fontSize: 21, fontWeight: 700, color: '#fff' },
  desc: { fontSize: 13, color: '#CBD5E1', margin: '4px 0 12px' },
  ask: { textAlign: 'left', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#FCD34D', cursor: 'pointer', width: '100%' },
};
