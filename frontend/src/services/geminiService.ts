// UI-compatible adapter: keeps the same API as the provided design, but calls our backend.
// The backend handles OCR/document processing + chat; the frontend should not call Gemini directly.

type HistoryItem = { role: string; parts: { text: string }[] };

export const generateAICAResponse = async (prompt: string, history: HistoryItem[]): Promise<string> => {
  const activeBusinessId = (() => {
    try {
      return localStorage.getItem('activeBusinessId');
    } catch {
      return null;
    }
  })();

  const resp = await fetch('/api/chat', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(activeBusinessId ? { 'X-Entity-Id': activeBusinessId } : {}),
    },
    body: JSON.stringify({
      message: prompt,
      // Preserve signature; backend currently ignores history, but we keep it here for future.
      history,
    }),
  });

  const data = await resp.json().catch(() => ({} as any));
  if (!resp.ok) {
    const err = (data && (data.error || data.message)) || `Request failed: ${resp.status}`;
    throw new Error(String(err));
  }

  return (data && (data.response || data.message)) || "I couldn't generate a response. Please try again.";
};


