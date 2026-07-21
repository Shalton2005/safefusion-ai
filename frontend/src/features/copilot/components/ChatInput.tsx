/**
 * ChatInput
 *
 * Auto-growing textarea + composer toolbar for the copilot message box.
 * Enter submits, Shift+Enter inserts a newline — standard chat-input
 * behaviour. Toolbar adds three lightweight, UI-only enterprise
 * affordances (no backend wiring, matching this feature's actual
 * `POST /ai/chat` surface):
 *   - Paperclip — "Attach incident report" (selects a file for display only)
 *   - "@" mention — autocomplete over a static Zone/Worker/Permit/Sensor/Camera list
 *   - Mic — push-to-talk toggle (visual recording state only, no audio capture)
 *
 * @example
 * <ChatInput onSend={sendMessage} disabled={isSending} />
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Mic, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { MENTION_OPTIONS, MENTION_CATEGORY_ICON, type MentionOption } from '../data/mentionOptions';

export interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_TEXTAREA_HEIGHT_PX = 160;

/** Finds the "@partialQuery" run ending at the cursor, if any — drives when the mention dropdown opens. */
function findActiveMention(value: string, cursor: number): { start: number; query: string } | null {
  const uptoCursor = value.slice(0, cursor);
  const at = uptoCursor.lastIndexOf('@');
  if (at === -1) return null;
  const query = uptoCursor.slice(at + 1);
  // A space (or newline) ends the mention run — only bare "@word" triggers the dropdown.
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Ask about permits, workers, sensors, CCTV or emergency procedures…' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMentions = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return MENTION_OPTIONS.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.category.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [mention]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mention?.query]);

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
    setAttachedFileName(null);
    setMention(null);
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });
  };

  const insertMention = (option: MentionOption) => {
    if (!mention || !textareaRef.current) return;
    const before = value.slice(0, mention.start);
    const after = value.slice(mention.start + 1 + mention.query.length);
    const inserted = `@${option.label} `;
    const next = `${before}${inserted}${after}`;
    setValue(next);
    setMention(null);

    const caret = before.length + inserted.length;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
      resize();
    });
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    resize();
    setMention(findActiveMention(next, e.target.selectionStart ?? next.length));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAttachedFileName(file ? file.name : null);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      {attachedFileName && (
        <div className="flex items-center gap-2 self-start rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-sunken)] px-2.5 py-1 text-xs text-[var(--sf-text-secondary)] motion-safe:animate-fade-in">
          <Paperclip className="w-3 h-3 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
          <span className="truncate max-w-[16rem]">{attachedFileName}</span>
          <button
            type="button"
            onClick={() => setAttachedFileName(null)}
            aria-label="Remove attachment"
            className="flex-shrink-0 rounded-full p-0.5 text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-raised)] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-1.5 rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-sunken)] p-2 transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--sf-border-focus)] focus-within:ring-2 focus-within:ring-primary-500/30">
        {/* Mention autocomplete dropdown */}
        {mention && filteredMentions.length > 0 && (
          <div
            role="listbox"
            aria-label="Mention suggestions"
            className="absolute bottom-full left-2 mb-2 w-72 max-h-64 overflow-y-auto rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-card)] shadow-lg py-1 motion-safe:animate-fade-in z-10"
          >
            {filteredMentions.map((option, index) => {
              const Icon = MENTION_CATEGORY_ICON[option.category];
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(option);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors duration-100',
                    index === activeIndex
                      ? 'bg-primary-600/10 text-[var(--sf-text-primary)]'
                      : 'text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-raised)]',
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
                  <span className="min-w-0 truncate">{option.label}</span>
                  <span className="ml-auto flex-shrink-0 text-2xs uppercase tracking-wide text-[var(--sf-text-tertiary)]">
                    {option.category}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Left: attach */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <Button
          type="button"
          variant="ghost"
          size="md"
          iconOnly
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          title="Attach incident report"
          aria-label="Attach incident report"
          leftIcon={<Paperclip className="w-4 h-4" />}
          className="flex-shrink-0"
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setMention(null)}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          aria-label="Message the AI Safety Copilot"
          aria-autocomplete="list"
          aria-expanded={Boolean(mention && filteredMentions.length > 0)}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-tertiary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Right: push-to-talk + send */}
        <Button
          type="button"
          variant={isRecording ? 'danger' : 'ghost'}
          size="md"
          iconOnly
          disabled={disabled}
          onClick={() => setIsRecording((v) => !v)}
          title="Push-to-talk"
          aria-label="Push-to-talk"
          aria-pressed={isRecording}
          leftIcon={<Mic className="w-4 h-4" />}
          className={cn('flex-shrink-0', isRecording && 'motion-safe:animate-pulse')}
        />
        <Button
          type="button"
          size="md"
          iconOnly
          disabled={disabled || value.trim().length === 0}
          onClick={submit}
          aria-label="Send message"
          leftIcon={<SendHorizontal className="w-4 h-4" />}
          className="flex-shrink-0 transition-transform duration-150 enabled:hover:scale-105"
        />
      </div>
    </div>
  );
}
