import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import { Search, Plus, Trash2, FileText, Database } from 'lucide-react';

export const NotesView: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Editor form
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadNotes = useCallback(async () => {
    const list = searchQuery.trim()
      ? await ipc.searchNotes(searchQuery)
      : await ipc.getNotes(false);
    setNotes(list);
    if (!selectedNote && list.length > 0) {
      setSelectedNote(list[0] || null);
    }
  }, [searchQuery, selectedNote]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSaveNote = async () => {
    if (!title.trim()) return;
    const newNote = await ipc.createNote({ title, content });
    setTitle('');
    setContent('');
    setIsCreating(false);
    setSelectedNote(newNote);
    await loadNotes();
  };

  const handleSoftDelete = async (id: string) => {
    await ipc.softDeleteNote(id);
    setSelectedNote(null);
    await loadNotes();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-6xl mx-auto w-full">
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Notes & Knowledge
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Database className="w-3 h-3" /> FTS5 Enabled
            </span>
          </h2>
          <p className="text-sm text-slate-400">
            Penyimpanan catatan pribadi berbasis Markdown dengan pencarian teks penuh lokal
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setTitle('');
            setContent('');
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          Catatan Baru
        </button>
      </div>

      {/* Main split view: Sidebar list + Detail Editor */}
      <div className="flex-1 flex gap-5 mt-5 overflow-hidden">
        {/* Left: Notes List & Search */}
        <div className="w-80 flex flex-col border-r border-slate-800 pr-4 overflow-hidden">
          {/* Search Box */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari catatan (FTS5 token)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {notes.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                {searchQuery ? 'Tidak ada hasil FTS5 yang cocok.' : 'Belum ada catatan tersimpan.'}
              </div>
            ) : (
              notes.map((n) => {
                const isSelected = selectedNote?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelectedNote(n);
                      setIsCreating(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <h4
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-indigo-300' : 'text-slate-200'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{n.content}</p>
                    <span className="text-[10px] text-slate-500 block mt-2">
                      {new Date(n.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Note Detail / Create View */}
        <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800 rounded-2xl p-5 overflow-hidden">
          {isCreating ? (
            <div className="flex-1 flex flex-col space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul Catatan..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-base font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis konten catatan (Markdown didukung)..."
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNote}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          ) : selectedNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedNote.title}</h3>
                  <span className="text-xs text-slate-500">
                    Terakhir diubah: {new Date(selectedNote.updated_at).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => handleSoftDelete(selectedNote.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center gap-1 border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                {selectedNote.content}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              <FileText className="w-10 h-10 mb-2 opacity-40" />
              Pilih catatan di sisi kiri atau buat catatan baru
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

