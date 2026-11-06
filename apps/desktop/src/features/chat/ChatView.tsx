import React, { useState } from 'react';
import { CommandIntent } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Send,
  Sparkles,
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
      text: 'Halo! Saya MAVEN, asisten produktivitas pribadi Anda. Ketikkan instruksi bahasa alami seperti "buat tugas review proposal besok urgent" atau "ingatkan telepon klien besok".',
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
      // Interpret command (Deterministic first, then AI fallback)
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
            text: `Saya memahami instruksi Anda sebagai **${intent.intent}** (${
              intent.is_deterministic ? 'Deterministic Regex (<2ms)' : 'AI Model'
            }). Harap periksa parameter terstruktur di bawah:`,
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
                text: `${m.text}\n\n✅ Tindakan berhasil dieksekusi dan disimpan ke database lokal SQLite.`,
              }
            : m
        )
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-4xl mx-auto w-full">
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            AI Command Assistant
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Safe Execution Layer
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Perintah bahasa alami dipetakan ke intent terstruktur sebelum disimpan ke SQLite
          </p>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-indigo-400 border border-slate-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Intent Confirmation Card */}
                {msg.intent && !msg.executed && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5 text-indigo-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        Parameter Terstruktur
                      </span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        Confidence: {(msg.intent.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg">
                      {Object.entries(msg.intent.parameters).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-200">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleConfirmAction(msg.id, msg.intent!)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Konfirmasi & Simpan
                      </button>
                    </div>
                  </div>
                )}

                <span
                  className={`text-[10px] block mt-1.5 ${
                    isUser ? 'text-indigo-200 text-right' : 'text-slate-500'
                  }`}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 italic">
            <Bot className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Memetakan bahasa alami ke intent terstruktur...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="relative mt-auto">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik instruksi produktivitas... (cth: 'buat tugas analisa log besok urgent')"
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-5 pr-28 py-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
        >
          <span>Kirim</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

