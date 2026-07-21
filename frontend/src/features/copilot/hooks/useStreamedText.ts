/**
 * useStreamedText
 *
 * Streaming placeholder: reveals an already-fetched string incrementally
 * (word-by-word) instead of all at once, so the chat UI reads like a
 * live response even though `POST /ai/chat` returns the full reply in
 * one response body — there is no token-streaming endpoint (SSE/WS) on
 * the backend to consume. This never generates or alters any text, it
 * only paces how already-real content is revealed.
 *
 * @example
 * const { displayedText, isStreaming } = useStreamedText(message.content, message.status === 'complete');
 */

import { useEffect, useRef, useState } from 'react';

const WORD_INTERVAL_MS = 35;

export interface UseStreamedTextResult {
  displayedText: string;
  isStreaming: boolean;
}

export function useStreamedText(fullText: string, active: boolean): UseStreamedTextResult {
  const [displayedText, setDisplayedText] = useState(active ? '' : fullText);
  const [isStreaming, setIsStreaming] = useState(false);
  const revealedTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !fullText) {
      setDisplayedText(fullText);
      setIsStreaming(false);
      return;
    }

    // Only re-run the reveal animation the first time this exact text
    // becomes active — re-renders with the same fullText shouldn't restart it.
    if (revealedTextRef.current === fullText) return;
    revealedTextRef.current = fullText;

    const words = fullText.split(' ');
    let index = 0;
    setDisplayedText('');
    setIsStreaming(true);

    const id = setInterval(() => {
      index += 1;
      setDisplayedText(words.slice(0, index).join(' '));
      if (index >= words.length) {
        clearInterval(id);
        setIsStreaming(false);
      }
    }, WORD_INTERVAL_MS);

    return () => {
      clearInterval(id);
      // Undo the "already revealed" mark if this run gets torn down before
      // finishing (e.g. StrictMode's dev-only mount/cleanup/remount) so the
      // next effect run doesn't see a false match and skip re-arming —
      // otherwise the text stays stuck at '' with isStreaming true forever.
      if (revealedTextRef.current === fullText) revealedTextRef.current = null;
    };
  }, [fullText, active]);

  return { displayedText, isStreaming };
}
