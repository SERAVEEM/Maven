import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus, Subtask, TaskComment } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  X,
  Zap,
  Share2,
  ThumbsUp,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Tag,
} from 'lucide-react';

export interface TeamMember {
  id: string;
  name: string;
  color: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'FN', name: 'Fawwaz Naufal', color: '#de350b' },
  { id: 'RD', name: 'Rangga Dwi', color: '#6e5dc6' },
  { id: 'AB', name: 'Aditya Bagus', color: '#0052cc' },
  { id: 'LA', name: 'Lia Anggraini', color: '#216e4e' },
];

export function getMemberInitials(assignee?: string | null): string {
  if (!assignee) return 'FN';
  if (['FN', 'RD', 'AB', 'LA'].includes(assignee)) return assignee;
  const parts = assignee.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return assignee.slice(0, 2).toUpperCase();
}

export function getMemberColor(initials: string): string {
  const found = TEAM_MEMBERS.find((m) => m.id === initials);
  return found ? found.color : '#579dff';
}

interface TaskDetailDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (updated: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  // Local state for editable task fields
  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');

  // Subtasks & Comments
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [newCommentText, setNewCommentText] = useState('');

  // UI state
  const [isLiked, setIsLiked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync with prop task
  useEffect(() => {
    if (task) {
      setCurrentTask(task);
      setTitleInput(task.title);
      setDescInput(task.description || '');
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    }
  }, [task]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Save updated task helper
  const persistTaskUpdate = useCallback(
    async (patch: Partial<Task>) => {
      if (!currentTask) return;
      const updated = await ipc.updateTask({
        id: currentTask.id,
        task_key: patch.task_key !== undefined ? patch.task_key : currentTask.task_key,
        title: patch.title !== undefined ? patch.title : currentTask.title,
        description: patch.description !== undefined ? (patch.description ?? '') : (currentTask.description ?? ''),
        status: patch.status !== undefined ? patch.status : currentTask.status,
        priority: patch.priority !== undefined ? patch.priority : currentTask.priority,
        starts_at: patch.starts_at !== undefined ? patch.starts_at : currentTask.starts_at,
        due_at: patch.due_at !== undefined ? patch.due_at : currentTask.due_at,
        epic: patch.epic !== undefined ? patch.epic : currentTask.epic,
        color: patch.color !== undefined ? patch.color : currentTask.color,
        assignee: patch.assignee !== undefined ? patch.assignee : currentTask.assignee,
        subtasks: patch.subtasks !== undefined ? patch.subtasks : currentTask.subtasks,
        comments: patch.comments !== undefined ? patch.comments : currentTask.comments,
      });
      setCurrentTask(updated);
      if (onTaskUpdated) onTaskUpdated(updated);
    },
    [currentTask, onTaskUpdated]
  );

  if (!isOpen || !currentTask) return null;

  // Title save
  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (!titleInput.trim() || titleInput === currentTask.title) {
      setTitleInput(currentTask.title);
      return;
    }
    await persistTaskUpdate({ title: titleInput.trim() });
  };

  // Description save
  const handleSaveDescription = async () => {
    setIsEditingDesc(false);
    await persistTaskUpdate({ description: descInput.trim() });
  };

  // Subtask handlers
  const currentSubtasks: Subtask[] = currentTask.subtasks || [];

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !currentTask) return;
    const newSubtask: Subtask = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const updatedSubtasks = [...currentSubtasks, newSubtask];
    await persistTaskUpdate({ subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!currentTask) return;
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    await persistTaskUpdate({ subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!currentTask) return;
    const updatedSubtasks = currentSubtasks.filter((st) => st.id !== subtaskId);
    await persistTaskUpdate({ subtasks: updatedSubtasks });
  };

  // Comment handlers
  const currentComments: TaskComment[] = currentTask.comments || [];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentTask) return;
    const authorInitials = getMemberInitials(currentTask.assignee);
    const authorMember = TEAM_MEMBERS.find((m) => m.id === authorInitials) || TEAM_MEMBERS[0]!;
    const newComment: TaskComment = {
      id: `comm-${Date.now()}`,
      author: `${authorMember.name} (${authorMember.id})`,
      text: newCommentText.trim(),
      created_at: new Date().toISOString(),
    };
    const updatedComments = [newComment, ...currentComments];
    await persistTaskUpdate({ comments: updatedComments });
    setNewCommentText('');
  };

  // Assignee change
  const handleAssigneeChange = async (nextId: string) => {
    const member = TEAM_MEMBERS.find((m) => m.id === nextId);
    const assigneeVal = member ? member.id : nextId;
    await persistTaskUpdate({ assignee: assigneeVal });
  };

  // Soft delete task
  const handleDeleteTask = async () => {
    if (confirm(`Move issue ${currentTask.task_key} to Trash?`)) {
      await ipc.softDeleteTask(currentTask.id);
      if (onTaskDeleted) onTaskDeleted(currentTask.id);
      onClose();
    }
  };

  // Share link copy
  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Calculate subtask completion progress
  const completedSubtasksCount = currentSubtasks.filter((s) => s.completed).length;
  const totalSubtasksCount = currentSubtasks.length;
  const progressPercent = totalSubtasksCount > 0
    ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100)
    : 0;

  // Selected member metadata
  const currentInitials = getMemberInitials(currentTask.assignee);
  const currentMember = TEAM_MEMBERS.find((m) => m.id === currentInitials) || TEAM_MEMBERS[0]!;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-[1px]"
      />

      {/* Slide-Over Drawer Container */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[580px] md:w-[620px] max-w-full bg-[#1d2125] border-l border-[#282e33] z-50 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200 select-none font-sans"
        aria-label="Jira Issue Detail Drawer"
      >
        {/* 1. TOP HEADER */}
        <div className="h-12 border-b border-[#282e33] bg-[#161a1d] px-5 flex items-center justify-between flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-xs min-w-0">
            <span className="text-[#8c9bab] font-medium truncate">Perspective x GPL</span>
            <span className="text-[#738496]">/</span>
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-[#8777d9] fill-[#8777d9]/20" />
              <span className="font-mono text-xs font-bold text-[#579dff]">
                {currentTask.task_key}
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleShare}
              title="Share issue link"
              className="p-1.5 rounded-[3px] text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors relative"
            >
              <Share2 className="w-4 h-4" />
              {isCopied && (
                <span className="absolute -bottom-7 right-0 bg-[#22272b] text-[10px] text-[#579dff] px-2 py-0.5 rounded-[3px] border border-[#282e33] shadow-lg whitespace-nowrap">
                  Link copied!
                </span>
              )}
            </button>

            <button
              onClick={() => setIsLiked(!isLiked)}
              title="Thumbs up"
              className={`p-1.5 rounded-[3px] transition-colors ${
                isLiked
                  ? 'text-[#579dff] bg-[#22272b]'
                  : 'text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              title="Close drawer (Esc)"
              className="p-1.5 rounded-[3px] text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. DRAWER CONTENT (Scrollable Main Left Section + Right Rail) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col md:flex-row gap-6">
          {/* MAIN LEFT SECTION */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Inline Editable Title */}
            <div>
              {isEditingTitle ? (
                <input
                  type="text"
                  autoFocus
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setTitleInput(currentTask.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="w-full text-lg font-bold text-[#c7d1db] bg-[#22272b] border border-[#579dff] px-2.5 py-1.5 rounded-[3px] focus:outline-none"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to edit title"
                  className="text-lg font-bold text-[#c7d1db] hover:bg-[#22272b] p-1.5 -ml-1.5 rounded-[3px] cursor-pointer transition-colors break-words leading-tight"
                >
                  {currentTask.title}
                </h2>
              )}
            </div>

            {/* Description Section */}
            <div>
              <div className="text-xs font-semibold text-[#8c9bab] mb-2 flex items-center justify-between">
                <span>Description</span>
                {!isEditingDesc && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="text-[11px] text-[#579dff] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    autoFocus
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Add a description... (Markdown supported)"
                    className="w-full bg-[#161a1d] border border-[#579dff] text-xs text-[#c7d1db] p-3 rounded-[3px] focus:outline-none placeholder-[#738496] leading-relaxed"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1 bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] font-semibold text-xs rounded-[3px] transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDescInput(currentTask.description || '');
                        setIsEditingDesc(false);
                      }}
                      className="px-3 py-1 bg-transparent hover:bg-[#22272b] text-[#8c9bab] hover:text-[#c7d1db] text-xs rounded-[3px] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className={`text-xs p-3 rounded-[3px] cursor-pointer transition-colors ${
                    currentTask.description
                      ? 'text-[#c7d1db] bg-[#161a1d] hover:bg-[#22272b] border border-[#282e33] whitespace-pre-wrap leading-relaxed'
                      : 'text-[#738496] bg-[#161a1d]/50 hover:bg-[#22272b] border border-dashed border-[#282e33]'
                  }`}
                >
                  {currentTask.description || 'Add a description...'}
                </div>
              )}
            </div>

            {/* Subtasks Checklist */}
            <div className="border-t border-[#282e33] pt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-[#8c9bab]">Subtasks</span>
                  <span className="px-1.5 py-0.2 rounded bg-[#22272b] text-[#8c9bab] text-[10px] font-bold">
                    {completedSubtasksCount} of {totalSubtasksCount} completed
                  </span>
                </div>
                {totalSubtasksCount > 0 && (
                  <span className="text-[11px] font-mono text-[#8c9bab]">
                    {progressPercent}%
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {totalSubtasksCount > 0 && (
                <div className="h-1.5 w-full bg-[#282e33] rounded-[2px] overflow-hidden mb-3.5">
                  <div
                    className="h-full bg-[#4bce97] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Subtask Items */}
              <div className="space-y-1.5 mb-3">
                {currentSubtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-[3px] bg-[#161a1d] hover:bg-[#22272b] border border-[#282e33] group transition-colors"
                  >
                    <div
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex items-center space-x-2.5 flex-1 min-w-0 cursor-pointer"
                    >
                      <button
                        type="button"
                        className="text-[#8c9bab] hover:text-[#579dff] flex-shrink-0 focus:outline-none"
                      >
                        {st.completed ? (
                          <CheckSquare className="w-4 h-4 text-[#4bce97]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#738496]" />
                        )}
                      </button>
                      <span
                        className={`text-xs truncate ${
                          st.completed ? 'line-through text-[#738496]' : 'text-[#c7d1db]'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteSubtask(st.id)}
                      title="Delete subtask"
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#738496] hover:text-[#ff5630] transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* + Create Subtask inline input */}
              <form onSubmit={handleAddSubtask} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="+ What needs to be done?"
                  className="flex-1 bg-[#161a1d] border border-[#282e33] focus:border-[#579dff] text-xs text-[#c7d1db] px-3 py-1.5 rounded-[3px] focus:outline-none placeholder-[#738496]"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="px-3 py-1.5 bg-[#22272b] hover:bg-[#282e33] disabled:opacity-50 text-[#c7d1db] text-xs font-semibold rounded-[3px] border border-[#282e33] transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Activity & Comments Feed */}
            <div className="border-t border-[#282e33] pt-5">
              <div className="flex items-center justify-between border-b border-[#282e33] pb-2 mb-4">
                <span className="text-xs font-semibold text-[#8c9bab]">Activity</span>
                <div className="flex space-x-3 text-xs">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`font-semibold pb-1 border-b-2 transition-colors ${
                      activeTab === 'comments'
                        ? 'text-[#579dff] border-[#579dff]'
                        : 'text-[#8c9bab] border-transparent hover:text-[#c7d1db]'
                    }`}
                  >
                    Comments ({currentComments.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`font-semibold pb-1 border-b-2 transition-colors ${
                      activeTab === 'history'
                        ? 'text-[#579dff] border-[#579dff]'
                        : 'text-[#8c9bab] border-transparent hover:text-[#c7d1db]'
                    }`}
                  >
                    History
                  </button>
                </div>
              </div>

              {activeTab === 'comments' ? (
                <div className="space-y-4">
                  {/* Add comment box */}
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <div className="flex items-start space-x-2.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-1"
                        style={{ backgroundColor: currentMember.color }}
                      >
                        {currentMember.id}
                      </div>
                      <textarea
                        rows={2}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 bg-[#161a1d] border border-[#282e33] focus:border-[#579dff] text-xs text-[#c7d1db] p-2.5 rounded-[3px] focus:outline-none placeholder-[#738496] leading-relaxed"
                      />
                    </div>
                    {newCommentText.trim() && (
                      <div className="flex justify-end space-x-2 pl-8">
                        <button
                          type="button"
                          onClick={() => setNewCommentText('')}
                          className="px-2.5 py-1 text-xs text-[#8c9bab] hover:text-[#c7d1db]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] font-semibold text-xs rounded-[3px] transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Comments List */}
                  <div className="space-y-3.5 pt-2">
                    {currentComments.length === 0 ? (
                      <div className="text-xs text-[#738496] italic py-2">
                        No comments yet on this issue.
                      </div>
                    ) : (
                      currentComments.map((c) => {
                        const authorInitials = getMemberInitials(c.author);
                        const color = getMemberColor(authorInitials);
                        const timeAgo = new Date(c.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <div key={c.id} className="flex items-start space-x-2.5 text-xs">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: color }}
                            >
                              {authorInitials}
                            </div>
                            <div className="flex-1 min-w-0 bg-[#161a1d] border border-[#282e33] p-2.5 rounded-[3px]">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-semibold text-[#c7d1db]">{c.author}</span>
                                <span className="text-[10px] text-[#738496]">{timeAgo}</span>
                              </div>
                              <div className="text-xs text-[#b6c2cf] whitespace-pre-wrap leading-relaxed">
                                {c.text}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* History Tab */
                <div className="space-y-2.5 text-xs text-[#8c9bab]">
                  <div className="p-2.5 bg-[#161a1d] border border-[#282e33] rounded-[3px] space-y-1">
                    <div className="text-[#c7d1db] font-semibold">Issue Created</div>
                    <div className="text-[10px] text-[#738496]">
                      {new Date(currentTask.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#161a1d] border border-[#282e33] rounded-[3px] space-y-1">
                    <div className="text-[#c7d1db] font-semibold">Last Updated</div>
                    <div className="text-[10px] text-[#738496]">
                      {new Date(currentTask.updated_at).toLocaleString()}
                    </div>
                  </div>
                  {currentTask.completed_at && (
                    <div className="p-2.5 bg-[#161a1d] border border-[#282e33] rounded-[3px] space-y-1">
                      <div className="text-[#4bce97] font-semibold">Completed</div>
                      <div className="text-[10px] text-[#738496]">
                        {new Date(currentTask.completed_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT RAIL (Details Metadata) */}
          <div className="w-full md:w-[190px] flex-shrink-0 space-y-4 pt-1 md:border-l md:border-[#282e33] md:pl-5 text-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#738496]">
              Details
            </div>

            {/* Status Dropdown */}
            <div>
              <label className="block text-[11px] text-[#8c9bab] mb-1">Status</label>
              <select
                value={currentTask.status}
                onChange={async (e) => {
                  const nextStatus = e.target.value as TaskStatus;
                  await persistTaskUpdate({
                    status: nextStatus,
                    completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
                  });
                }}
                className={`w-full text-xs font-bold uppercase px-2 py-1.5 rounded-[3px] border cursor-pointer focus:outline-none ${
                  currentTask.status === 'done'
                    ? 'bg-[#216e4e]/20 text-[#4bce97] border-[#216e4e]/40'
                    : currentTask.status === 'in_progress'
                    ? 'bg-[#0055cc]/20 text-[#579dff] border-[#0055cc]/40'
                    : currentTask.status === 'todo'
                    ? 'bg-[#7f5f01]/20 text-[#f5cd47] border-[#7f5f01]/40'
                    : 'bg-[#22272b] text-[#8c9bab] border-[#282e33]'
                }`}
              >
                <option value="backlog" className="bg-[#1d2125] text-[#8c9bab]">
                  BACKLOG
                </option>
                <option value="todo" className="bg-[#1d2125] text-[#f5cd47]">
                  TO DO
                </option>
                <option value="in_progress" className="bg-[#1d2125] text-[#579dff]">
                  IN PROGRESS
                </option>
                <option value="done" className="bg-[#1d2125] text-[#4bce97]">
                  DONE
                </option>
              </select>
            </div>

            {/* Assignee Selector */}
            <div>
              <label className="block text-[11px] text-[#8c9bab] mb-1">Assignee</label>
              <div className="flex items-center space-x-2 bg-[#161a1d] border border-[#282e33] rounded-[3px] px-2 py-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: currentMember.color }}
                >
                  {currentMember.id}
                </div>
                <select
                  value={currentMember.id}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="bg-transparent text-xs text-[#c7d1db] w-full focus:outline-none cursor-pointer"
                >
                  {TEAM_MEMBERS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#1d2125] text-[#c7d1db]">
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority Dropdown */}
            <div>
              <label className="block text-[11px] text-[#8c9bab] mb-1">Priority</label>
              <div className="flex items-center space-x-1.5 bg-[#161a1d] border border-[#282e33] rounded-[3px] px-2 py-1.5">
                <AlertCircle
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    currentTask.priority === 'urgent'
                      ? 'text-[#ff5630]'
                      : currentTask.priority === 'high'
                      ? 'text-[#ffab00]'
                      : currentTask.priority === 'medium'
                      ? 'text-[#579dff]'
                      : 'text-[#8c9bab]'
                  }`}
                />
                <select
                  value={currentTask.priority}
                  onChange={async (e) => {
                    await persistTaskUpdate({ priority: e.target.value as TaskPriority });
                  }}
                  className="bg-transparent text-xs text-[#c7d1db] w-full focus:outline-none capitalize cursor-pointer"
                >
                  <option value="low" className="bg-[#1d2125]">
                    Low
                  </option>
                  <option value="medium" className="bg-[#1d2125]">
                    Medium
                  </option>
                  <option value="high" className="bg-[#1d2125]">
                    High
                  </option>
                  <option value="urgent" className="bg-[#1d2125]">
                    Urgent
                  </option>
                </select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[11px] text-[#8c9bab] mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={currentTask.starts_at ? currentTask.starts_at.slice(0, 10) : ''}
                onChange={async (e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  await persistTaskUpdate({ starts_at: val });
                }}
                className="w-full bg-[#161a1d] border border-[#282e33] text-xs text-[#c7d1db] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#579dff] cursor-pointer"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[11px] text-[#8c9bab] mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={currentTask.due_at ? currentTask.due_at.slice(0, 10) : ''}
                onChange={async (e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  await persistTaskUpdate({ due_at: val });
                }}
                className="w-full bg-[#161a1d] border border-[#282e33] text-xs text-[#c7d1db] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#579dff] cursor-pointer"
              />
            </div>

            {/* Epic Badge */}
            <div>
              <label className="block text-[11px] text-[#8c9bab] mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>Epic</span>
              </label>
              <input
                type="text"
                value={currentTask.epic || ''}
                onChange={(e) => setCurrentTask({ ...currentTask, epic: e.target.value })}
                onBlur={async () => {
                  await persistTaskUpdate({ epic: currentTask.epic?.trim() || null });
                }}
                placeholder="e.g. Frontend, Design"
                className="w-full bg-[#161a1d] border border-[#282e33] text-xs text-[#c7d1db] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#579dff]"
              />
            </div>

            {/* Soft Delete Action Button */}
            <div className="pt-4 border-t border-[#282e33]">
              <button
                type="button"
                onClick={handleDeleteTask}
                className="w-full py-1.5 px-3 rounded-[3px] bg-[#22272b] hover:bg-[#ff5630]/20 border border-[#282e33] hover:border-[#ff5630]/40 text-xs text-[#ff5630] font-medium transition-colors flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
