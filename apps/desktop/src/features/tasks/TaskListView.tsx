import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus, Project } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  RotateCcw,
  AlertCircle,
  Tag,
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
    await ipc.updateTask({ id: task.id, status: nextStatus });
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

  const priorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'high':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'medium':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full">
      {/* View Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Task Management</h2>
          <p className="text-sm text-slate-400">
            Kelola tugas harian secara local-first dengan proteksi soft delete
          </p>
        </div>

        {/* View Filter Tabs */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'active'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({tasks.filter((t) => t.deleted_at === null && t.status !== 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('done')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'done'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed ({tasks.filter((t) => t.deleted_at === null && t.status === 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'trash'
                ? 'bg-rose-600/80 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trash Bin ({tasks.filter((t) => t.deleted_at !== null).length})
          </button>
        </div>
      </div>

      {/* Quick Add Bar (only in active view) */}
      {activeTab === 'active' && (
        <form onSubmit={handleCreateTask} className="mt-5 flex gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tambah tugas baru... (tekan Enter untuk menyimpan)"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={newProjectId}
            onChange={(e) => setNewProjectId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[140px]"
          >
            <option value="">(No Project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      )}

      {/* Task List Content */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Memuat data SQLite...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/20">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">Tidak ada tugas pada filter ini.</p>
            <p className="text-xs text-slate-600 mt-1">
              Tambahkan tugas baru melalui form di atas atau via AI Assistant di tab Chat.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const project = projects.find((p) => p.id === task.project_id);
            const isDone = task.status === 'done';
            const isDeleted = task.deleted_at !== null;

            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isDeleted
                    ? 'bg-rose-950/10 border-rose-900/30 text-slate-400'
                    : isDone
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                  {!isDeleted && (
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="text-slate-500 hover:text-indigo-400 transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  )}

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-sm font-medium truncate ${
                        isDone ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </span>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      {project && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Tag className="w-3 h-3 text-indigo-400" />
                          {project.name}
                        </span>
                      )}
                      {task.due_at && (
                        <span className="flex items-center gap-1 text-amber-400/90">
                          <Clock className="w-3 h-3" />
                          {new Date(task.due_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right badges & actions */}
                <div className="flex items-center space-x-2.5 flex-shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${priorityColor(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>

                  {isDeleted ? (
                    <button
                      onClick={() => handleRestore(task.id)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSoftDelete(task.id)}
                      title="Soft delete (Pindahkan ke Sampah)"
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
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

