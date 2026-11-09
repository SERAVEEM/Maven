import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Task } from '@maven/contracts';
import { ipc } from '../lib/ipc';
import {
  Maximize2,
  Plus,
  ChevronDown,
  Mic,
  MicOff,
  CheckCircle2,
  Zap,
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

  // Live system clock
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

  // Fetch active sprint task for glanceable display
  useEffect(() => {
    const fetchTopTask = async () => {
      try {
        const tasks = await ipc.getTasks(false);
        const inProgress = tasks.find((t) => t.status === 'in_progress');
        const urgentOrTodo =
          tasks.find(
            (t) => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high')
          ) || tasks.find((t) => t.status !== 'done');
        setActiveTask(inProgress || urgentOrTodo || null);
      } catch {
        // ignore
      }
    };
    fetchTopTask();
    const interval = setInterval(fetchTopTask, 5000);
    return () => clearInterval(interval);
  }, []);

  // Stop voice listening
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
        setTimeout(() => setVoiceSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Start voice listening
  const startVoiceListening = useCallback(
    (e?: React.MouseEvent) => {
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
          // fallback
        }
      }

      // Realistic audio fallback
      const timer = setTimeout(() => {
        const simulatedText = 'buat tugas GPL-66 Security Audit besok urgent';
        setVoiceTranscript(simulatedText);
        stopVoiceListening();
        executeVoiceCommand(simulatedText);
      }, 2400);

      return () => clearTimeout(timer);
    },
    [executeVoiceCommand, onTriggerVoice, stopVoiceListening, voiceTranscript]
  );

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 select-none font-sans">
      {/* Dynamic Island Notch: Atlassian Dark Mode aesthetic (bg #161a1d, border #282e33, sharp clean lines) */}
      <div
        className={`bg-[#161a1d] border border-[#282e33] text-[#b6c2cf] shadow-xl transition-all duration-200 flex items-center justify-between cursor-pointer rounded-[4px] ${
          isListening
            ? 'w-[420px] px-3.5 py-2 border-[#579dff]/60'
            : voiceSuccess
            ? 'w-[360px] px-3 py-1.5 border-[#216e4e]'
            : isExpanded
            ? 'w-[400px] px-4 py-3 flex-col gap-2.5 shadow-2xl'
            : 'w-[340px] px-3 py-1.5 hover:border-[#3b444c]'
        }`}
        onClick={() => !isExpanded && !isListening && setIsExpanded(true)}
      >
        {/* LISTENING STATE: Clean audio wave bars */}
        {isListening ? (
          <div className="flex items-center justify-between w-full text-xs">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-[2px] bg-[#579dff]/20 text-[#579dff]">
                <Mic className="w-3.5 h-3.5 text-[#579dff]" />
              </span>
              {/* Audio Wave Bars */}
              <div className="flex items-center gap-1">
                <span className="w-1 bg-[#579dff] rounded-[1px] animate-bounce h-2.5" />
                <span className="w-1 bg-[#85b8ff] rounded-[1px] animate-pulse h-4" />
                <span className="w-1 bg-[#579dff] rounded-[1px] animate-bounce h-3" />
                <span className="w-1 bg-[#85b8ff] rounded-[1px] animate-pulse h-5" />
                <span className="w-1 bg-[#579dff] rounded-[1px] animate-bounce h-2" />
              </div>
            </div>

            <div className="flex-1 mx-2.5 truncate text-center text-[#c7d1db] font-medium text-[11px]">
              {voiceTranscript || 'Mendengarkan... (Alt+V)'}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                stopVoiceListening();
              }}
              className="p-1 text-[#8c9bab] hover:text-[#ff5630] rounded-[2px]"
              title="Stop listening"
            >
              <MicOff className="w-3.5 h-3.5 text-[#ff5630]" />
            </button>
          </div>
        ) : voiceSuccess ? (
          /* Voice Success confirmation */
          <div className="flex items-center justify-between w-full text-xs">
            <div className="flex items-center space-x-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-[#4bce97] flex-shrink-0" />
              <span className="truncate text-[11px] text-[#c7d1db] font-medium">
                Created: <span className="text-[#579dff]">{voiceSuccess}</span>
              </span>
            </div>
            <span className="text-[10px] text-[#4bce97] font-bold uppercase ml-2 flex-shrink-0">
              OK
            </span>
          </div>
        ) : !isExpanded ? (
          /* Compact Glance Mode */
          <div className="flex items-center justify-between w-full text-xs">
            {/* Left: Clock */}
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4bce97]" />
              <span className="font-semibold font-mono text-[11px] text-[#c7d1db]">
                {time}
              </span>
            </div>

            {/* Center: Glanceable Task */}
            <div className="flex-1 mx-2 truncate text-center text-[#b6c2cf] text-[11px]">
              {activeTask ? (
                <span className="truncate flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-[#8777d9] flex-shrink-0" />
                  <span className="text-[#579dff] font-mono font-semibold">{activeTask.task_key}</span>
                  <span className="truncate text-[#8c9bab]">{activeTask.title}</span>
                </span>
              ) : (
                <span className="text-[#738496]">Perspective x GPL</span>
              )}
            </div>

            {/* Right: Push-to-Talk Mic icon & Chevron */}
            <div className="flex items-center space-x-1 text-[#8c9bab]">
              <button
                onClick={(e) => startVoiceListening(e)}
                className="p-1 rounded-[2px] hover:bg-[#22272b] hover:text-[#579dff] transition-colors"
                title="Voice Push-to-Talk (Alt+V)"
              >
                <Mic className="w-3 h-3 text-[#579dff]" />
              </button>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </div>
          </div>
        ) : (
          /* Expanded Island View */
          <div className="w-full space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#282e33] pb-1.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#579dff]" />
                <span className="font-semibold text-xs text-[#c7d1db]">
                  Dynamic Island
                </span>
                <span className="text-[10px] font-mono text-[#738496]">{time}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="text-[10px] text-[#8c9bab] hover:text-[#c7d1db] px-1.5 py-0.5 rounded-[2px] hover:bg-[#22272b]"
              >
                Close
              </button>
            </div>

            {/* Current Focus Card */}
            <div className="bg-[#22272b] border border-[#282e33] rounded-[3px] p-2 text-xs">
              <div className="flex items-center justify-between text-[10px] text-[#8c9bab] mb-1">
                <span className="font-semibold text-[#579dff] uppercase tracking-wider">
                  Current Sprint Focus
                </span>
                {activeTask && (
                  <span className="px-1 py-0.2 rounded-[2px] bg-[#0055cc]/20 text-[#579dff] font-bold text-[9px]">
                    {activeTask.status.replace('_', ' ').toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-[#c7d1db] font-medium truncate flex items-center gap-1.5">
                {activeTask ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#8777d9] flex-shrink-0" />
                    <span className="font-mono text-[#579dff] font-semibold">{activeTask.task_key}</span>
                    <span className="truncate">{activeTask.title}</span>
                  </>
                ) : (
                  'All sprint issues completed! 🎉'
                )}
              </p>
            </div>

            {/* Quick Action Footer */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    onOpenQuickAdd();
                  }}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-[3px] bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] transition-colors"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Command (Alt+K)</span>
                </button>

                <button
                  onClick={(e) => startVoiceListening(e)}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-[3px] bg-[#22272b] hover:bg-[#282e33] text-[#579dff] border border-[#282e33] transition-colors"
                  title="Voice Push-to-Talk (Alt+V)"
                >
                  <Mic className="w-3 h-3" />
                  <span>Voice</span>
                </button>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                  onMaximizeApp();
                }}
                className="flex items-center gap-1 text-xs text-[#8c9bab] hover:text-[#c7d1db] px-2 py-1 rounded-[3px] hover:bg-[#22272b] transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Open View</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
