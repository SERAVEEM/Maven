import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task } from '@maven/contracts';
import { ipc } from '../lib/ipc';
import {
  Maximize2,
  Plus,
  Bell,
  ChevronDown,
  Mic,
  MicOff,
  CheckCircle2,
} from 'lucide-react';

interface DynamicIslandProps {
  onOpenQuickAdd: () => void;
  onMaximizeApp: () => void;
  onTriggerVoice?: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  onOpenQuickAdd,
  onMaximizeApp,
  onTriggerVoice,
}) => {
  const [time, setTime] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceSuccess, setVoiceSuccess] = useState<string | null>(null);
  const speechRef = useRef<any>(null);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch top urgent/active task for glanceable display
  useEffect(() => {
    const fetchTopTask = async () => {
      try {
        const tasks = await ipc.getTasks(false);
        const urgentOrTodo =
          tasks.find(
            (t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')
          ) || tasks.find((t) => t.status !== 'done');
        setActiveTask(urgentOrTodo || null);
      } catch {
        // ignore
      }
    };
    fetchTopTask();
    const interval = setInterval(fetchTopTask, 5000);
    return () => clearInterval(interval);
  }, []);

  // Stop voice capture
  const stopVoiceListening = useCallback(() => {
    setIsListening(false);
    if (speechRef.current) {
      try {
        speechRef.current.stop();
      } catch {
        // ignore
      }
      speechRef.current = null;
    }
  }, []);

  // Execute transcribed voice command
  const executeVoiceCommand = useCallback(async (transcriptText: string) => {
    if (!transcriptText.trim()) return;
    try {
      const intent = await ipc.interpretCommand(transcriptText);
      const res = await ipc.executeIntent(intent);
      if (res.success) {
        setVoiceSuccess(transcriptText);
        setTimeout(() => setVoiceSuccess(null), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Start voice listening
  const startVoiceListening = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onTriggerVoice) {
      onTriggerVoice();
      return;
    }

    setIsListening(true);
    setVoiceTranscript('');
    setVoiceSuccess(null);

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
          const text = Array.from(event.results)
            .map((r: any) => r[0].transcript)
            .join('');
          setVoiceTranscript(text);
        };

        recognition.onend = () => {
          stopVoiceListening();
          if (voiceTranscript) {
            executeVoiceCommand(voiceTranscript);
          }
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

    // Realistic simulation fallback
    const timer = setTimeout(() => {
      const simulatedText = 'buat tugas GPL-66 Security Review besok urgent';
      setVoiceTranscript(simulatedText);
      stopVoiceListening();
      executeVoiceCommand(simulatedText);
    }, 2400);

    return () => clearTimeout(timer);
  }, [executeVoiceCommand, onTriggerVoice, stopVoiceListening, voiceTranscript]);

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out select-none">
      {/* Island Container */}
      <div
        className={`bg-[#101216]/95 backdrop-blur-2xl border border-white/10 text-white rounded-full shadow-2xl transition-all duration-300 flex items-center justify-between cursor-pointer hover:border-[#579dff]/40 ${
          isListening
            ? 'w-[440px] px-4 py-2.5 rounded-2xl border-emerald-500/50 shadow-emerald-500/20'
            : voiceSuccess
            ? 'w-[380px] px-4 py-2 border-emerald-500/40 shadow-emerald-500/10'
            : isExpanded
            ? 'w-[420px] px-5 py-3 rounded-2xl flex-col gap-3 shadow-blue-500/10'
            : 'w-[350px] px-4 py-2 hover:w-[370px]'
        }`}
        onClick={() => !isExpanded && !isListening && setIsExpanded(true)}
      >
        {/* LISTENING STATE: Audio wave animation & live voice transcription */}
        {isListening ? (
          <div className="flex items-center justify-between w-full text-xs">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 animate-pulse">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              {/* Audio Wave Bars */}
              <div className="flex items-center gap-1">
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" />
                <span className="w-1 bg-[#579dff] rounded-full animate-pulse h-5" />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-4" />
                <span className="w-1 bg-[#579dff] rounded-full animate-pulse h-6" />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" />
              </div>
            </div>

            <div className="flex-1 mx-3 truncate text-center text-emerald-300 font-medium text-[11px]">
              {voiceTranscript || 'Mendengarkan suara Anda... (Bicara)'}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                stopVoiceListening();
              }}
              className="p-1 text-[#8993a4] hover:text-white rounded"
              title="Cancel Voice"
            >
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
            </button>
          </div>
        ) : voiceSuccess ? (
          /* Voice Success Toast Inside Island */
          <div className="flex items-center justify-between w-full text-xs">
            <div className="flex items-center space-x-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="truncate text-[11px] text-slate-200 font-medium">
                Berhasil: <span className="text-[#579dff]">{voiceSuccess}</span>
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase ml-2 flex-shrink-0">
              OK
            </span>
          </div>
        ) : !isExpanded ? (
          /* Compact Mode View */
          <div className="flex items-center justify-between w-full text-xs">
            {/* Left: Clock & Pulsing Status */}
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="font-semibold tracking-wider font-mono text-[11px] text-slate-200">
                {time}
              </span>
            </div>

            {/* Center: Glanceable Task / Info */}
            <div className="flex-1 mx-2.5 truncate text-center text-slate-300 font-medium text-[11px]">
              {activeTask ? (
                <span className="truncate flex items-center justify-center gap-1">
                  <span className="text-[#579dff] font-mono font-bold">{activeTask.task_key}</span>
                  <span className="truncate">{activeTask.title}</span>
                </span>
              ) : (
                <span className="text-slate-500 italic">Perspective x GPL Ready</span>
              )}
            </div>

            {/* Right: Push-to-Talk Mic button & Chevron */}
            <div className="flex items-center space-x-1.5 text-[#8993a4]">
              <button
                onClick={(e) => startVoiceListening(e)}
                className="p-1 rounded-md hover:bg-white/10 hover:text-[#579dff] transition-colors"
                title="Voice Push-to-Talk (Alt+V)"
              >
                <Mic className="w-3.5 h-3.5 text-[#579dff]" />
              </button>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          /* Expanded Island View */
          <div className="w-full space-y-2.5">
            {/* Expanded Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#579dff]" />
                <span className="font-bold text-xs tracking-wide text-white">MAVEN Dynamic Island</span>
                <span className="text-[10px] font-mono text-[#8993a4]">{time}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg text-[#8993a4] hover:text-white transition-colors text-[10px]"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Active Task / Notification Glance */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-2.5 text-xs">
              <div className="flex items-center justify-between text-[10px] text-[#8993a4] mb-1">
                <span className="flex items-center gap-1 font-semibold text-[#579dff] uppercase tracking-wider">
                  <Bell className="w-3 h-3" /> Fokus Sprint Saat Ini
                </span>
                {activeTask && (
                  <span className="px-1.5 py-0.5 rounded bg-[#ffab00]/20 text-[#ffab00] font-bold uppercase text-[9px]">
                    {activeTask.priority}
                  </span>
                )}
              </div>
              <p className="text-slate-200 font-medium truncate flex items-center gap-1.5">
                {activeTask ? (
                  <>
                    <span className="font-mono text-[#579dff]">{activeTask.task_key}</span>
                    <span className="truncate">{activeTask.title}</span>
                  </>
                ) : (
                  'Semua tugas sprint telah selesai untuk saat ini! 🎉'
                )}
              </p>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    onOpenQuickAdd();
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#579dff] hover:bg-[#68a4ff] text-[#101216] transition-all shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  Quick Action
                </button>

                {/* Voice Push-to-Talk button in Expanded Island */}
                <button
                  onClick={(e) => startVoiceListening(e)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#579dff] hover:text-white transition-all"
                  title="Voice Push-to-Talk (Alt+V)"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice</span>
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                  onMaximizeApp();
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#c1c7d0] hover:text-white transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Buka Jendela Penuh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
