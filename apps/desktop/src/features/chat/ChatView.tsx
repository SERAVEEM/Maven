import React, { useState } from 'react';
import { CommandIntent } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Send,
  CheckCircle2,
  Bot,
  User,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  intent?: CommandIntent;
  executed?: boolean;
  time: string;
}

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: 'Halo! Saya MAVEN Assistant. Anda dapat mengetik instruksi bahasa alami seperti "buat tugas GPL-66 Security Review besok urgent" atau "ingatkan sprint review lusa".',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userText = inputText;
    setInputText('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userText,
        time: timeStr,
      },
    ]);

    setIsProcessing(true);
    try {
      const intent = await ipc.interpretCommand(userText);

      if (intent.intent === 'clarification_needed') {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: intent.clarification_question || 'Perintah memerlukan klarifikasi lebih lanjut.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: 'assistant',
            text: `Instruksi dipetakan ke **${intent.intent}** (${
              intent.is_deterministic ? 'Deterministic Regex (<2ms)' : 'AI Model'
            }). Parameter terstruktur:`,
            intent,
            executed: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async (msgId: string, intent: CommandIntent) => {
    const result = await ipc.executeIntent(intent);
    if (result.success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                executed: true,
                text: `${m.text}\n\n✅ Berhasil dieksekusi dan disimpan ke database lokal SQLite.`,
              }
            : m
        )
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-4xl mx-auto w-full bg-transparent text-[#b6c2cf] font-sans">
      <div className="pb-4 border-b border-[#282e33] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#c7d1db] flex items-center gap-2">
            AI Assistant
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#579dff]/15 text-[#579dff] border border-[#579dff]/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#ffab00]" /> Safe Execution Layer
            </span>
          </h2>
          <p className="text-xs text-[#8c9bab] mt-0.5">
            Natural language command dispatcher for Perspective x GPL
          </p>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3.5 my-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#de350b] text-white'
                    : 'bg-[#22272b] text-[#579dff] border border-[#282e33]'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[75%] rounded-[4px] p-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-[#579dff] text-[#1d2125] font-medium shadow-sm'
                    : 'bg-[#161a1d] border border-[#282e33] text-[#c7d1db]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Intent Confirmation Card */}
                {msg.intent && !msg.executed && (
                  <div className="mt-2.5 p-2.5 rounded-[3px] bg-[#22272b] border border-[#282e33] text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold text-[#c7d1db]">
                      <span className="flex items-center gap-1.5 text-[#579dff]">
                        <Zap className="w-3 h-3" />
                        Parameters
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#161a1d] text-[#8c9bab]">
                        Confidence: {(msg.intent.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="space-y-0.5 font-mono text-[10px] text-[#8c9bab] bg-[#161a1d] p-2 rounded-[2px]">
                      {Object.entries(msg.intent.parameters).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-[#738496]">{k}:</span>
                          <span className="text-[#c7d1db]">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1.5 flex justify-end">
                      <button
                        onClick={() => handleConfirmAction(msg.id, msg.intent!)}
                        className="bg-[#216e4e] hover:bg-[#2abb7f] text-white px-3 py-1 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Save
                      </button>
                    </div>
                  </div>
                )}

                <span
                  className={`text-[9px] block mt-1 ${
                    isUser ? 'text-[#1d2125]/80 text-right' : 'text-[#738496]'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-xs text-[#738496] italic">
            <Bot className="w-3.5 h-3.5 animate-spin text-[#579dff]" />
            <span>Parsing command...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="relative mt-auto">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type natural language command... (e.g. 'buat tugas GPL-66 Testing besok urgent')"
          className="w-full bg-[#161a1d] border border-[#282e33] rounded-[3px] pl-3.5 pr-20 py-2.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className="absolute right-1.5 top-1.5 bottom-1.5 bg-[#579dff] hover:bg-[#85b8ff] disabled:opacity-40 text-[#1d2125] px-3 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Send</span>
          <Send className="w-3 h-3" />
        </button>
      </form>
    </div>
  );
};
