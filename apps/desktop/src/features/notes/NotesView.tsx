import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note, Tag } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Database,
  RotateCcw,
  Check,
  Loader2,
  Tag as TagIcon,
  X,
  Archive,
} from 'lucide-react';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export const NotesView: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

  // Editor state for selected note
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [newTagInput, setNewTagInput] = useState('');

  // Refs for debouncing and tracking edits
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectedNoteIdRef = useRef<string | null>(null);
  const editTitleRef = useRef('');
  const editContentRef = useRef('');

  selectedNoteIdRef.current = selectedNote?.id || null;
  editTitleRef.current = editTitle;
  editContentRef.current = editContent;

  // Load all tags
  const loadTags = useCallback(async () => {
    try {
      const tags = await ipc.getTags();
      setAllTags(tags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  }, []);

  // Load notes based on viewMode and searchQuery
  const loadNotes = useCallback(async () => {
    try {
      let list: Note[] = [];
      if (viewMode === 'trash') {
        const all = await ipc.getNotes(true);
        list = all.filter((n) => n.deleted_at !== null);
      } else {
        if (searchQuery.trim()) {
          list = await ipc.searchNotes(searchQuery);
        } else {
          list = await ipc.getNotes(false);
        }
      }

      setNotes(list);

      // Keep selection or select first
      if (list.length > 0) {
        const stillExists = list.find((n) => n.id === selectedNoteIdRef.current);
        if (stillExists) {
          setSelectedNote(stillExists);
        } else {
          setSelectedNote(list[0] || null);
        }
      } else {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }, [viewMode, searchQuery]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Sync editor fields when selectedNote changes
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setSaveStatus('saved');
    } else {
      setEditTitle('');
      setEditContent('');
      setSaveStatus('saved');
    }
  }, [selectedNote?.id]);

  // Core save function
  const performSave = useCallback(
    async (noteId: string, titleToSave: string, contentToSave: string) => {
      const trimmedTitle = titleToSave.trim() || 'Untitled Note';
      setSaveStatus('saving');
      try {
        const updated = await ipc.updateNote({
          id: noteId,
          title: trimmedTitle,
          content: contentToSave,
        });

        // Update in-memory notes list without refetching entire list
        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
        );
        setSelectedNote((prev) =>
          prev && prev.id === updated.id ? { ...prev, ...updated } : prev
        );
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save note:', err);
        setSaveStatus('unsaved');
      }
    },
    []
  );

  // Trigger debounced auto-save (600ms)
  const scheduleAutoSave = useCallback(() => {
    if (!selectedNoteIdRef.current) return;
    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const currentNoteId = selectedNoteIdRef.current;
    autoSaveTimerRef.current = setTimeout(() => {
      performSave(currentNoteId, editTitleRef.current, editContentRef.current);
    }, 600);
  }, [performSave]);

  // Handle immediate Ctrl+S save
  const handleImmediateSave = useCallback(() => {
    if (!selectedNoteIdRef.current) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    performSave(selectedNoteIdRef.current, editTitleRef.current, editContentRef.current);
  }, [performSave]);

  // Global Ctrl+S / Cmd+S listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleImmediateSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleImmediateSave]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitle(e.target.value);
    scheduleAutoSave();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    scheduleAutoSave();
  };

  // Create new note immediately and focus editor
  const handleCreateNewNote = async () => {
    try {
      const newNote = await ipc.createNote({
        title: 'Untitled Document',
        content: '',
      });
      setViewMode('active');
      setSearchQuery('');
      setSelectedTagId(null);
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
      setEditTitle(newNote.title);
      setEditContent('');
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  // Soft delete note
  const handleSoftDelete = async (id: string) => {
    try {
      await ipc.softDeleteNote(id);
      await loadNotes();
    } catch (err) {
      console.error('Failed to soft delete note:', err);
    }
  };

  // Restore note from trash
  const handleRestoreNote = async (id: string) => {
    try {
      await ipc.restoreNote(id);
      await loadNotes();
    } catch (err) {
      console.error('Failed to restore note:', err);
    }
  };

  // Tag management on the current note
  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const tagName = newTagInput.trim().replace(/^#/, '');
    if (!tagName || !selectedNote) return;

    try {
      // Find or create tag
      let tag = allTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
      if (!tag) {
        tag = await ipc.createTag(tagName);
        setAllTags((prev) => [...prev, tag!]);
      }

      const currentTagIds = (selectedNote.tags || []).map((t) => t.id);
      if (!currentTagIds.includes(tag.id)) {
        const newTagIds = [...currentTagIds, tag.id];
        const updatedTags = await ipc.setNoteTags(selectedNote.id, newTagIds);

        const updatedNote = { ...selectedNote, tags: updatedTags };
        setSelectedNote(updatedNote);
        setNotes((prev) =>
          prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
        );
      }
      setNewTagInput('');
    } catch (err) {
      console.error('Failed to attach tag:', err);
    }
  };

  const handleDetachTag = async (tagId: string) => {
    if (!selectedNote) return;
    try {
      const currentTagIds = (selectedNote.tags || []).map((t) => t.id);
      const remainingTagIds = currentTagIds.filter((id) => id !== tagId);
      const updatedTags = await ipc.setNoteTags(selectedNote.id, remainingTagIds);

      const updatedNote = { ...selectedNote, tags: updatedTags };
      setSelectedNote(updatedNote);
      setNotes((prev) =>
        prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
      );
    } catch (err) {
      console.error('Failed to detach tag:', err);
    }
  };

  // Filter notes by selected tag (if in active mode)
  const filteredNotes = notes.filter((n) => {
    if (!selectedTagId) return true;
    return n.tags?.some((t) => t.id === selectedTagId);
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-7xl mx-auto w-full bg-transparent text-[#b6c2cf] font-sans">
      {/* Top Header */}
      <div className="pb-4 border-b border-[#282e33] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#c7d1db] flex items-center gap-2">
            Docs & Knowledge
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#216e4e]/20 text-[#4bce97] border border-[#216e4e]/40 flex items-center gap-1">
              <Database className="w-3 h-3" /> FTS5 Local
            </span>
          </h2>
          <p className="text-xs text-[#8c9bab] mt-0.5">
            Full-text searchable documentation with auto-save and tag indexing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Active vs Trash View Toggle */}
          <div className="flex bg-[#22272b] p-0.5 rounded-[3px] border border-[#282e33] text-xs">
            <button
              onClick={() => {
                setViewMode('active');
                setSelectedTagId(null);
              }}
              className={`px-3 py-1 rounded-[2px] font-medium transition-colors ${
                viewMode === 'active'
                  ? 'bg-[#1d2125] text-[#579dff] shadow-sm'
                  : 'text-[#8c9bab] hover:text-[#c7d1db]'
              }`}
            >
              Active Notes
            </button>
            <button
              onClick={() => {
                setViewMode('trash');
                setSelectedTagId(null);
              }}
              className={`px-3 py-1 rounded-[2px] font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'trash'
                  ? 'bg-[#1d2125] text-[#ff5630] shadow-sm'
                  : 'text-[#8c9bab] hover:text-[#c7d1db]'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Trash</span>
            </button>
          </div>

          {viewMode === 'active' && (
            <button
              onClick={handleCreateNewNote}
              className="bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Main split view: Sidebar list + Detail Editor */}
      <div className="flex-1 flex gap-4 mt-4 overflow-hidden">
        {/* Left: Notes List, Search & Tag Filter */}
        <div className="w-80 flex flex-col border-r border-[#282e33] pr-3 overflow-hidden">
          {/* Search Box (Active mode FTS5) */}
          {viewMode === 'active' ? (
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-[#738496] absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search docs (FTS5 indexed)..."
                className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] pl-8 pr-3 py-1 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
              />
            </div>
          ) : (
            <div className="p-2 mb-2 bg-[#2c1b18] border border-[#ff5630]/30 rounded-[3px] text-[11px] text-[#ff8f73] flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Items in Trash can be restored with one click.</span>
            </div>
          )}

          {/* Tag Filter Chips (Active Mode) */}
          {viewMode === 'active' && allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none border-b border-[#282e33]">
              <button
                onClick={() => setSelectedTagId(null)}
                className={`text-[10px] px-2 py-0.5 rounded-[2px] font-medium whitespace-nowrap transition-colors ${
                  selectedTagId === null
                    ? 'bg-[#579dff] text-[#1d2125] font-semibold'
                    : 'bg-[#22272b] text-[#8c9bab] hover:text-[#c7d1db]'
                }`}
              >
                All Tags
              </button>
              {allTags.map((tag) => {
                const isSelected = selectedTagId === tag.id;
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(isSelected ? null : tag.id)}
                    className={`text-[10px] px-2 py-0.5 rounded-[2px] whitespace-nowrap flex items-center gap-1 transition-colors ${
                      isSelected
                        ? 'bg-[#579dff] text-[#1d2125] font-semibold'
                        : 'bg-[#22272b] text-[#8c9bab] hover:text-[#c7d1db] border border-[#282e33]'
                    }`}
                  >
                    <span>#{tag.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#738496]">
                {viewMode === 'trash'
                  ? 'Trash is empty.'
                  : searchQuery
                  ? 'No documents matched FTS5 search.'
                  : selectedTagId
                  ? 'No documents with this tag.'
                  : 'No documents created yet.'}
              </div>
            ) : (
              filteredNotes.map((n) => {
                const isSelected = selectedNote?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNote(n)}
                    className={`group w-full text-left p-2.5 rounded-[3px] border cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-[#22272b] border-[#579dff] text-[#579dff]'
                        : 'bg-[#161a1d] border-[#282e33] hover:border-[#3b444c]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs font-semibold truncate flex-1 ${
                          isSelected ? 'text-[#579dff]' : 'text-[#c7d1db]'
                        }`}
                      >
                        {n.title || 'Untitled Document'}
                      </h4>

                      {/* Quick Restore Button in Trash List */}
                      {viewMode === 'trash' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreNote(n.id);
                          }}
                          title="Restore Document"
                          className="opacity-80 hover:opacity-100 text-[#4bce97] hover:bg-[#216e4e]/20 p-1 rounded-[2px] transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-[#8c9bab] line-clamp-2 mt-0.5 font-sans">
                      {n.content || '(Empty document)'}
                    </p>

                    {/* Tag pills in list item */}
                    {n.tags && n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {n.tags.map((t) => (
                          <span
                            key={t.id}
                            className="text-[9px] px-1 py-0.2 rounded-[2px] bg-[#1d2125] text-[#85b8ff] border border-[#282e33]"
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-[#738496] block mt-1.5">
                      {viewMode === 'trash'
                        ? `Deleted ${new Date(n.deleted_at || n.updated_at).toLocaleDateString()}`
                        : `Updated ${new Date(n.updated_at).toLocaleDateString()}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Always-Editable Note Editor / Trash Detail View */}
        <div className="flex-1 flex flex-col bg-[#161a1d] border border-[#282e33] rounded-[4px] p-5 overflow-hidden">
          {selectedNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Trash Notice or Auto-save Status Header */}
              {viewMode === 'trash' ? (
                <div className="flex items-center justify-between pb-3 border-b border-[#282e33] mb-3 bg-[#2c1b18]/40 p-2.5 rounded-[3px] border border-[#ff5630]/20">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-[#ff5630]" />
                    <div>
                      <span className="text-xs font-semibold text-[#ff8f73]">
                        This document is currently in Trash
                      </span>
                      <p className="text-[10px] text-[#8c9bab]">
                        Deleted at {new Date(selectedNote.deleted_at || '').toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreNote(selectedNote.id)}
                    className="bg-[#216e4e] hover:bg-[#28855e] text-white px-3 py-1 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Document</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pb-2 border-b border-[#282e33] mb-3">
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {saveStatus === 'saving' && (
                        <span className="flex items-center gap-1 text-[#ffab00]">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="flex items-center gap-1 text-[#4bce97]">
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </span>
                      )}
                      {saveStatus === 'unsaved' && (
                        <span className="flex items-center gap-1 text-[#8c9bab]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffab00]" />
                          <span>Unsaved changes</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#738496]">
                      (Auto-saves 600ms or Ctrl+S)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSoftDelete(selectedNote.id)}
                      className="text-xs text-[#ff5630] hover:text-[#ff7452] hover:bg-[#2c1b18] px-2 py-1 rounded-[2px] flex items-center gap-1 transition-colors"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Move to Trash</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Title Input (Always Editable in Active mode) */}
              <div className="mb-2">
                <input
                  type="text"
                  value={editTitle}
                  disabled={viewMode === 'trash'}
                  onChange={handleTitleChange}
                  placeholder="Document Title..."
                  className="w-full bg-transparent border-0 border-b border-transparent focus:border-[#579dff] px-1 py-1.5 text-lg font-bold text-[#c7d1db] placeholder-[#738496] focus:outline-none transition-colors"
                />
              </div>

              {/* Tag Pills Section */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3 px-1">
                <TagIcon className="w-3 h-3 text-[#738496]" />

                {/* Attached Tags */}
                {(selectedNote.tags || []).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[3px] bg-[#22272b] border border-[#282e33] text-[#579dff]"
                  >
                    <span>#{tag.name}</span>
                    {viewMode === 'active' && (
                      <button
                        onClick={() => handleDetachTag(tag.id)}
                        className="text-[#8c9bab] hover:text-[#ff5630] ml-0.5 focus:outline-none"
                        title="Detach tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}

                {/* Inline Tag Input */}
                {viewMode === 'active' && (
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="+ Add tag (Enter)..."
                    className="bg-[#22272b] border border-dashed border-[#282e33] focus:border-[#579dff] rounded-[3px] px-2 py-0.5 text-[11px] text-[#c7d1db] placeholder-[#738496] focus:outline-none"
                  />
                )}
              </div>

              {/* Content Textarea (Always Editable plain/markdown in Active mode) */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <textarea
                  value={editContent}
                  disabled={viewMode === 'trash'}
                  onChange={handleContentChange}
                  placeholder="Write your document content here (Markdown supported)..."
                  className="flex-1 w-full bg-[#181b1f] border border-[#282e33] focus:border-[#579dff] rounded-[3px] p-3 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none resize-none font-mono leading-relaxed transition-colors"
                />
              </div>

              {/* Footer info */}
              <div className="pt-2 text-[10px] text-[#738496] flex items-center justify-between">
                <span>
                  {editContent.length} characters • {editContent.split(/\s+/).filter(Boolean).length} words
                </span>
                <span>
                  Last modified: {new Date(selectedNote.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#738496] text-xs">
              <FileText className="w-10 h-10 mb-2 opacity-30 text-[#579dff]" />
              <p className="font-medium text-[#8c9bab]">
                {viewMode === 'trash' ? 'No document selected from trash' : 'Select a document or create a new one'}
              </p>
              {viewMode === 'active' && (
                <button
                  onClick={handleCreateNewNote}
                  className="mt-3 bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Document</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
