/**
 * ChatInput
 *
 * Auto-growing textarea + send button for composing a copilot message.
 * Enter submits, Shift+Enter inserts a newline — standard chat-input
 * behaviour.
 *
 * @example
 * <ChatInput onSend={sendMessage} disabled={isSending} />
 */

import { useRef, useState, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui';

export interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_TEXTAREA_HEIGHT_PX = 160;

export function ChatInput({ onSend, disabled = false, placeholder = 'Ask the AI Safety Copilot…' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-sunken)] p-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--sf-border-focus)] focus-within:ring-2 focus-within:ring-primary-500/30">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        aria-label="Message the AI Safety Copilot"
        className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-tertiary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <Button
        type="button"
        size="md"
        iconOnly
        disabled={disabled || value.trim().length === 0}
        onClick={submit}
        aria-label="Send message"
        className="transition-transform duration-150 enabled:hover:scale-105"
      >
        <SendHorizontal className="w-4 h-4" />
      </Button>
    </div>
  );
}
