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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-6xl mx-auto w-full bg-[#1d2125] text-[#b6c2cf] font-sans">
      <div className="pb-4 border-b border-[#282e33] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#c7d1db] flex items-center gap-2">
            Docs & Knowledge
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#216e4e]/20 text-[#4bce97] border border-[#216e4e]/40 flex items-center gap-1">
              <Database className="w-3 h-3" /> FTS5 Local
            </span>
          </h2>
          <p className="text-xs text-[#8c9bab] mt-0.5">
            Full-text searchable documentation and technical architecture specs
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(true);
            setTitle('');
            setContent('');
          }}
          className="bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Document</span>
        </button>
      </div>

      {/* Main split view: Sidebar list + Detail Editor */}
      <div className="flex-1 flex gap-4 mt-4 overflow-hidden">
        {/* Left: Notes List & Search */}
        <div className="w-72 flex flex-col border-r border-[#282e33] pr-3 overflow-hidden">
          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-[#738496] absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs (FTS5)..."
              className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] pl-8 pr-3 py-1 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {notes.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#738496]">
                {searchQuery ? 'No FTS5 results.' : 'No docs created yet.'}
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
                    className={`w-full text-left p-2.5 rounded-[3px] border transition-colors ${
                      isSelected
                        ? 'bg-[#22272b] border-[#579dff] text-[#579dff]'
                        : 'bg-[#161a1d] border-[#282e33] hover:border-[#3b444c]'
                    }`}
                  >
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-[#579dff]' : 'text-[#c7d1db]'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-[#8c9bab] line-clamp-2 mt-0.5">{n.content}</p>
                    <span className="text-[9px] text-[#738496] block mt-1.5">
                      {new Date(n.updated_at).toLocaleDateString()}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Note Detail / Create View */}
        <div className="flex-1 flex flex-col bg-[#161a1d] border border-[#282e33] rounded-[4px] p-4 overflow-hidden">
          {isCreating ? (
            <div className="flex-1 flex flex-col space-y-2.5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title..."
                className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-2 text-sm font-semibold text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write doc content (Markdown supported)..."
                className="flex-1 w-full bg-[#22272b] border border-[#282e33] rounded-[3px] p-3 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff] resize-none font-mono"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[#282e33]">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-[#8c9bab] hover:text-[#c7d1db]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] px-4 py-1.5 rounded-[3px] text-xs font-semibold shadow-sm"
                >
                  Save Document
                </button>
              </div>
            </div>
          ) : selectedNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#282e33] mb-3">
                <div>
                  <h3 className="text-base font-bold text-[#c7d1db]">{selectedNote.title}</h3>
                  <span className="text-[11px] text-[#738496]">
                    Updated: {new Date(selectedNote.updated_at).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => handleSoftDelete(selectedNote.id)}
                  className="text-xs text-[#ff5630] hover:underline p-1.5 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 text-xs text-[#c7d1db] whitespace-pre-wrap leading-relaxed font-sans">
                {selectedNote.content}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#738496] text-xs">
              <FileText className="w-8 h-8 mb-2 opacity-40" />
              Select a document or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
