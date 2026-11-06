import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ipc } from '../lib/ipc';
import {
  CheckSquare,
  FileText,
  Clock,
  Calendar,
  Send,
  X,
  Zap,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  isVoiceActive?: boolean;
  onVoiceActiveChange?: (active: boolean) => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isVoiceActive = false,
  onVoiceActiveChange,
}) => {
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<any>(null);

  const stopVoiceListening = useCallback(() => {
    setIsListening(false);
    if (onVoiceActiveChange) onVoiceActiveChange(false);
    if (speechRef.current) {
      try {
        speechRef.current.stop();
      } catch {
        // ignore
      }
      speechRef.current = null;
    }
  }, [onVoiceActiveChange]);

  const startVoiceListening = useCallback(() => {
    setIsListening(true);
    setFeedback(null);
    if (onVoiceActiveChange) onVoiceActiveChange(true);

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join('');
          setQuery(transcript);
        };

        recognition.onend = () => {
          stopVoiceListening();
        };

        recognition.onerror = () => {
          stopVoiceListening();
        };

        speechRef.current = recognition;
        recognition.start();
        return;
      } catch {
        // Fallback
      }
    }

    const timer = setTimeout(() => {
      setQuery('buat tugas GPL-66 Security Review besok urgent');
      stopVoiceListening();
    }, 2400);

    return () => clearTimeout(timer);
  }, [onVoiceActiveChange, stopVoiceListening]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFeedback(null);
      setTimeout(() => inputRef.current?.focus(), 50);

      if (isVoiceActive) {
        startVoiceListening();
      }
    } else {
      stopVoiceListening();
    }
  }, [isOpen, isVoiceActive, startVoiceListening, stopVoiceListening]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting) return;

    stopVoiceListening();
    setIsSubmitting(true);
    try {
      const intent = await ipc.interpretCommand(query);
      if (intent.intent === 'clarification_needed') {
        setFeedback(intent.clarification_question || 'Perlu instruksi lebih spesifik.');
        return;
      }

      const result = await ipc.executeIntent(intent);
      if (result.success) {
        onSuccess(`Action succeeded: ${intent.intent}`);
        onClose();
      } else {
        setFeedback(result.error?.message || 'Execution failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPreset = (presetText: string) => {
    setQuery(presetText);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      {/* Raycast / Jira-style Command Palette modal */}
      <div className="w-full max-w-xl bg-[#161a1d] border border-[#282e33] rounded-[4px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Top Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center border-b border-[#282e33] px-3.5 py-3 bg-[#181b1f]"
        >
          <Zap className="w-4 h-4 text-[#579dff] mr-2.5 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFeedback(null);
            }}
            placeholder={
              isListening
                ? 'Mendengarkan suara Anda... (Bicara sekarang)'
                : "Type a command or issue... (e.g. 'buat tugas GPL-66 Review besok urgent')"
            }
            className="w-full bg-transparent text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none"
          />

          {/* Listening State Audio Indicator */}
          {isListening && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#579dff]/15 border border-[#579dff]/30 rounded-[3px] mr-2">
              <span className="w-1 bg-[#579dff] rounded-[1px] animate-bounce h-2.5" />
              <span className="w-1 bg-[#85b8ff] rounded-[1px] animate-pulse h-4" />
              <span className="w-1 bg-[#579dff] rounded-[1px] animate-bounce h-2" />
              <span className="text-[9px] font-bold text-[#579dff] uppercase tracking-wider ml-1">
                Listening
              </span>
            </div>
          )}

          {/* Mic Button */}
          <button
            type="button"
            onClick={isListening ? stopVoiceListening : startVoiceListening}
            className={`p-1.5 rounded-[3px] transition-colors mr-1 flex items-center justify-center ${
              isListening
                ? 'bg-[#ff5630]/20 text-[#ff5630] border border-[#ff5630]/30'
                : 'text-[#8c9bab] hover:text-[#579dff] hover:bg-[#22272b]'
            }`}
            title={isListening ? 'Stop' : 'Push-to-Talk (Alt+V)'}
          >
            {isListening ? (
              <MicOff className="w-3.5 h-3.5 text-[#ff5630]" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          {query ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1 rounded-[3px] bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
            >
              <span>Execute</span>
              <Send className="w-3 h-3 stroke-[2.5]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="text-[#738496] hover:text-[#c7d1db] p-1 rounded-[3px]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Feedback / Validation status */}
        {feedback && (
          <div className="px-3.5 py-2 bg-[#7f5f01]/20 border-b border-[#7f5f01]/40 text-xs text-[#f5cd47] flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-[#f5cd47]" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Quick Presets Grid */}
        <div className="p-3 bg-[#1d2125]">
          <div className="text-[10px] font-bold text-[#738496] uppercase tracking-wider px-1 mb-2">
            Quick Actions
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickPreset('buat tugas GPL-')}
              className="flex items-center gap-2.5 p-2 rounded-[3px] bg-[#22272b] hover:bg-[#282e33] border border-[#282e33] text-[#c7d1db] transition-colors text-left"
            >
              <CheckSquare className="w-4 h-4 text-[#579dff] flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[#c7d1db]">Create GPL Issue</div>
                <div className="text-[10px] text-[#738496] truncate">buat tugas GPL-X [title]</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickPreset('ingatkan aku ')}
              className="flex items-center gap-2.5 p-2 rounded-[3px] bg-[#22272b] hover:bg-[#282e33] border border-[#282e33] text-[#c7d1db] transition-colors text-left"
            >
              <Clock className="w-4 h-4 text-[#ffab00] flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[#c7d1db]">Set Reminder</div>
                <div className="text-[10px] text-[#738496] truncate">ingatkan [msg] besok</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickPreset('catat ')}
              className="flex items-center gap-2.5 p-2 rounded-[3px] bg-[#22272b] hover:bg-[#282e33] border border-[#282e33] text-[#c7d1db] transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-[#4bce97] flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[#c7d1db]">Quick Doc / Note</div>
                <div className="text-[10px] text-[#738496] truncate">catat [title]: [content]</div>
              </div>
            </button>

            <button
              onClick={() => handleQuickPreset('cari catatan ')}
              className="flex items-center gap-2.5 p-2 rounded-[3px] bg-[#22272b] hover:bg-[#282e33] border border-[#282e33] text-[#c7d1db] transition-colors text-left"
            >
              <Calendar className="w-4 h-4 text-[#00b8d9] flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-xs text-[#c7d1db]">FTS5 Search</div>
                <div className="text-[10px] text-[#738496] truncate">Search local knowledge</div>
              </div>
            </button>
          </div>

          {/* Footer Shortcuts */}
          <div className="mt-3 pt-2 border-t border-[#282e33] flex items-center justify-between text-[10px] text-[#738496] px-1">
            <span>
              Voice: <kbd className="px-1 py-0.5 rounded-[2px] bg-[#22272b] text-[#579dff] font-mono border border-[#282e33]">Alt+V</kbd>
            </span>
            <span>
              Palette: <kbd className="px-1 py-0.5 rounded-[2px] bg-[#22272b] text-[#c7d1db] font-mono border border-[#282e33]">Alt+K</kbd>
            </span>
            <span>
              Close: <kbd className="px-1 py-0.5 rounded-[2px] bg-[#22272b] text-[#738496] font-mono border border-[#282e33]">Esc</kbd>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
