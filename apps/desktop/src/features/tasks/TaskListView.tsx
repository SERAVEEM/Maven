import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus, Project } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Plus,
  CheckSquare,
  Square,
  Clock,
  Trash2,
  RotateCcw,
  Zap,
} from 'lucide-react';

export const TaskListView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'done' | 'trash'>('active');
  const [isLoading, setIsLoading] = useState(true);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allTasks, allProjects] = await Promise.all([
        ipc.getTasks(true), // include soft-deleted
        ipc.getProjects(),
      ]);
      setTasks(allTasks);
      setProjects(allProjects);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ipc.createTask({
        title: newTitle,
        priority: newPriority,
        project_id: newProjectId || undefined,
      });
      setNewTitle('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    await ipc.updateTask({
      id: task.id,
      status: nextStatus,
      completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
    });
    await loadData();
  };

  const handleSoftDelete = async (id: string) => {
    await ipc.softDeleteTask(id);
    await loadData();
  };

  const handleRestore = async (id: string) => {
    await ipc.restoreTask(id);
    await loadData();
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'trash') return t.deleted_at !== null;
    if (t.deleted_at !== null) return false;
    if (activeTab === 'done') return t.status === 'done';
    return t.status !== 'done';
  });

  const priorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return 'bg-[#ff5630]/20 text-[#ff5630] border-[#ff5630]/30';
      case 'high':
        return 'bg-[#ffab00]/20 text-[#ffab00] border-[#ffab00]/30';
      case 'medium':
        return 'bg-[#579dff]/20 text-[#579dff] border-[#579dff]/30';
      default:
        return 'bg-[#22272b] text-[#8c9bab] border-[#282e33]';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full bg-transparent text-[#b6c2cf] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#282e33]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#c7d1db]">List Issues</h2>
          <p className="text-xs text-[#8c9bab] mt-0.5">
            Perspective x GPL issue items with soft-delete safety
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-[#161a1d] border border-[#282e33] p-0.5 rounded-[3px] text-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1 rounded-[3px] font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-[#579dff] text-[#1d2125] font-semibold'
                : 'text-[#8c9bab] hover:text-[#c7d1db]'
            }`}
          >
            Active ({tasks.filter((t) => t.deleted_at === null && t.status !== 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`px-3 py-1 rounded-[3px] font-medium transition-colors ${
              activeTab === 'done'
                ? 'bg-[#579dff] text-[#1d2125] font-semibold'
                : 'text-[#8c9bab] hover:text-[#c7d1db]'
            }`}
          >
            Completed ({tasks.filter((t) => t.deleted_at === null && t.status === 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-3 py-1 rounded-[3px] font-medium transition-colors ${
              activeTab === 'trash'
                ? 'bg-[#ff5630] text-white font-semibold'
                : 'text-[#8c9bab] hover:text-[#c7d1db]'
            }`}
          >
            Trash ({tasks.filter((t) => t.deleted_at !== null).length})
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      {activeTab === 'active' && (
        <form onSubmit={handleCreateTask} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add new issue..."
            className="flex-1 bg-[#22272b] border border-[#282e33] rounded-[3px] px-3.5 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
          />

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] focus:outline-none focus:border-[#579dff]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={newProjectId}
            onChange={(e) => setNewProjectId(e.target.value)}
            className="bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] focus:outline-none focus:border-[#579dff] max-w-[150px]"
          >
            <option value="">Perspective x GPL</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmitting}
            className="bg-[#579dff] hover:bg-[#85b8ff] disabled:opacity-50 text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>
        </form>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-1.5 pr-1">
        {isLoading ? (
          <div className="text-center py-12 text-[#738496] text-xs">Loading SQLite data...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#282e33] rounded-[3px] bg-[#161a1d]">
            <p className="text-[#8c9bab] text-xs font-medium">No issues found in this view.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'done';
            const isDeleted = task.deleted_at !== null;

            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-2.5 rounded-[3px] border transition-colors ${
                  isDeleted
                    ? 'bg-[#181b1f] border-[#ff5630]/30 text-[#8c9bab]'
                    : isDone
                    ? 'bg-[#181b1f] border-[#282e33] opacity-70'
                    : 'bg-[#22272b] border-[#282e33] hover:border-[#3b444c]'
                }`}
              >
                <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                  {!isDeleted && (
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="text-[#738496] hover:text-[#579dff] transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-[#4bce97]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#738496]" />
                      )}
                    </button>
                  )}

                  <Zap className="w-3.5 h-3.5 text-[#8777d9] flex-shrink-0" />

                  <span className="font-mono text-xs font-semibold text-[#8c9bab] flex-shrink-0">
                    {task.task_key}
                  </span>

                  <span
                    className={`text-xs truncate ${
                      isDone ? 'line-through text-[#738496]' : 'text-[#c7d1db]'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {task.due_at && (
                    <span className="flex items-center gap-1 text-[10px] text-[#738496]">
                      <Clock className="w-3 h-3 text-[#ffab00]" />
                      {new Date(task.due_at).toLocaleDateString()}
                    </span>
                  )}

                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] border ${priorityBadge(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  {isDeleted ? (
                    <button
                      onClick={() => handleRestore(task.id)}
                      className="text-xs text-[#579dff] hover:underline flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[#22272b]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSoftDelete(task.id)}
                      title="Move to trash"
                      className="opacity-0 group-hover:opacity-100 text-[#738496] hover:text-[#ff5630] p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
