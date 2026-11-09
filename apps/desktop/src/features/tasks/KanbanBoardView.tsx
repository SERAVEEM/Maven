import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  TaskDetailDrawer,
  getMemberInitials,
  getMemberColor,
} from './TaskDetailDrawer';
import {
  Zap,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  Plus,
  CheckSquare,
  ChevronUp,
  ChevronDown,
  Equal,
  AlertCircle,
  Columns,
} from 'lucide-react';

export const KanbanBoardView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBacklog, setShowBacklog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Inline task creation in columns
  const [activeCreatingColumn, setActiveCreatingColumn] = useState<TaskStatus | null>(null);
  const [quickCreateTitle, setQuickCreateTitle] = useState('');

  const loadTasks = useCallback(async () => {
    const list = await ipc.getTasks(false);
    setTasks(list);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMoveStatus = async (task: Task, nextStatus: TaskStatus) => {
    const updated = await ipc.updateTask({
      id: task.id,
      status: nextStatus,
      completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    showToast(`${task.task_key} moved to ${nextStatus.replace('_', ' ').toUpperCase()}`);
  };

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  const handleQuickCreateSubmit = async (colStatus: TaskStatus) => {
    if (!quickCreateTitle.trim()) {
      setActiveCreatingColumn(null);
      return;
    }
    const created = await ipc.createTask({
      title: quickCreateTitle.trim(),
      status: colStatus,
      priority: 'medium',
      project_id: 'proj-gpl',
    });
    setTasks((prev) => [created, ...prev]);
    setQuickCreateTitle('');
    setActiveCreatingColumn(null);
    showToast(`Created issue ${created.task_key}`);
  };

  // Group tasks by column
  const backlogTasks = tasks.filter((t) => t.status === 'backlog');
  const todoTasks = tasks.filter((t) =>
    showBacklog ? t.status === 'todo' : t.status === 'todo' || t.status === 'backlog'
  );
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  interface ColumnDef {
    id: TaskStatus;
    title: string;
    count: number;
    items: Task[];
  }

  const columns: ColumnDef[] = [
    ...(showBacklog
      ? [{ id: 'backlog' as TaskStatus, title: 'BACKLOG', count: backlogTasks.length, items: backlogTasks }]
      : []),
    { id: 'todo' as TaskStatus, title: 'TO DO', count: todoTasks.length, items: todoTasks },
    { id: 'in_progress' as TaskStatus, title: 'IN PROGRESS', count: inProgressTasks.length, items: inProgressTasks },
    { id: 'done' as TaskStatus, title: 'DONE', count: doneTasks.length, items: doneTasks },
  ];

  // Priority icon renderer
  const renderPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span title="Urgent">
            <AlertCircle className="w-3.5 h-3.5 text-[#ff5630]" />
          </span>
        );
      case 'high':
        return (
          <span title="High">
            <ChevronUp className="w-3.5 h-3.5 text-[#ffab00]" />
          </span>
        );
      case 'medium':
        return (
          <span title="Medium">
            <Equal className="w-3.5 h-3.5 text-[#579dff]" />
          </span>
        );
      default:
        return (
          <span title="Low">
            <ChevronDown className="w-3.5 h-3.5 text-[#8c9bab]" />
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1d2125] text-[#b6c2cf] font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-8 z-50 bg-[#22272b] border border-[#282e33] text-[#c7d1db] px-3.5 py-2 rounded-[3px] shadow-2xl text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* Board Header */}
      <div className="px-6 py-3 border-b border-[#282e33] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#8c9bab]">
            <span>Spaces</span>
            <span>&gt;</span>
            <span className="text-[#c7d1db] font-semibold">Perspective x GPL</span>
            <span>&gt;</span>
            <span>Board</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#c7d1db] mt-1">
            GPL Kanban Board
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {/* Backlog Column Toggle */}
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-[3px] text-xs font-medium border transition-colors ${
              showBacklog
                ? 'bg-[#579dff]/15 text-[#579dff] border-[#579dff]/40'
                : 'bg-[#22272b] text-[#8c9bab] border-[#282e33] hover:text-[#c7d1db] hover:bg-[#282e33]'
            }`}
            title="Toggle Backlog Column"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{showBacklog ? 'Hide Backlog' : 'Show Backlog'}</span>
          </button>

          <span className="text-xs text-[#738496]">Sprint 1 (Active)</span>
          <span className="px-2 py-0.5 rounded-[3px] bg-[#22272b] text-[10px] text-[#579dff] font-semibold border border-[#282e33]">
            {tasks.length} total issues
          </span>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-4 items-start">
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-80 flex-shrink-0 bg-[#161a1d] border border-[#282e33] rounded-[4px] flex flex-col max-h-full overflow-hidden shadow-sm"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#282e33] flex items-center justify-between text-xs font-semibold text-[#8c9bab]">
              <div className="flex items-center space-x-2">
                <span>{col.title}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#22272b] text-[#c7d1db] text-[10px] font-bold">
                  {col.count}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setActiveCreatingColumn(col.id);
                    setQuickCreateTitle('');
                  }}
                  title={`+ Create issue in ${col.title}`}
                  className="p-1 rounded-[3px] text-[#738496] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 rounded-[3px] text-[#738496] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Create Input inside column */}
            {activeCreatingColumn === col.id && (
              <div className="p-2 border-b border-[#282e33] bg-[#22272b]/50">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleQuickCreateSubmit(col.id);
                  }}
                  className="space-y-1.5"
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder="What needs to be done?"
                    value={quickCreateTitle}
                    onChange={(e) => setQuickCreateTitle(e.target.value)}
                    className="w-full bg-[#161a1d] border border-[#579dff] text-xs text-[#c7d1db] p-2 rounded-[3px] focus:outline-none placeholder-[#738496]"
                  />
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveCreatingColumn(null)}
                      className="px-2 py-0.5 text-[11px] text-[#8c9bab] hover:text-[#c7d1db]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!quickCreateTitle.trim()}
                      className="px-2.5 py-0.5 bg-[#579dff] text-[#1d2125] font-semibold text-[11px] rounded-[3px] disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Cards List */}
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {col.items.map((task) => {
                const isDone = task.status === 'done';
                const subtaskList = task.subtasks || [];
                const totalSubtasks = subtaskList.length;
                const completedSubtasks = subtaskList.filter((s) => s.completed).length;

                const initials = getMemberInitials(task.assignee);
                const color = getMemberColor(initials);

                return (
                  <div
                    key={task.id}
                    onClick={() => handleCardClick(task)}
                    className="p-3 bg-[#22272b] hover:bg-[#282e33] border border-[#282e33] rounded-[3px] shadow-sm transition-all group cursor-pointer"
                  >
                    {/* Card Title */}
                    <div className="text-xs font-medium text-[#c7d1db] mb-2 leading-snug">
                      <span className={isDone ? 'line-through text-[#738496]' : ''}>
                        {task.title}
                      </span>
                    </div>

                    {/* Metadata Badges: Epic Tag & Subtask Progress */}
                    <div className="flex items-center flex-wrap gap-1.5 mb-2.5">
                      {task.epic && (
                        <span className="inline-block text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#1d2125] text-[#8c9bab] border border-[#282e33]">
                          {task.epic}
                        </span>
                      )}

                      {totalSubtasks > 0 && (
                        <span
                          className={`inline-flex items-center space-x-1 text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border ${
                            completedSubtasks === totalSubtasks
                              ? 'bg-[#216e4e]/20 text-[#4bce97] border-[#216e4e]/40'
                              : 'bg-[#1d2125] text-[#8c9bab] border-[#282e33]'
                          }`}
                          title={`Subtasks: ${completedSubtasks} of ${totalSubtasks} completed`}
                        >
                          <CheckSquare className="w-2.5 h-2.5 text-[#4bce97]" />
                          <span>
                            {completedSubtasks}/{totalSubtasks}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Card Footer: Issue Key, Priority Icon, Assignee Avatar, Move Actions */}
                    <div className="flex items-center justify-between pt-1 text-xs border-t border-[#282e33]/50">
                      <div className="flex items-center space-x-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#8777d9] fill-[#8777d9]/20" />
                        <span className="font-mono text-[11px] font-semibold text-[#8c9bab] group-hover:text-[#579dff]">
                          {task.task_key}
                        </span>
                        {renderPriorityIcon(task.priority)}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* 1-Click Status Mover Buttons */}
                        {col.id !== (showBacklog ? 'backlog' : 'todo') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevStatus =
                                col.id === 'done'
                                  ? 'in_progress'
                                  : col.id === 'in_progress'
                                  ? 'todo'
                                  : 'backlog';
                              handleMoveStatus(task, prevStatus);
                            }}
                            className="p-1 rounded hover:bg-[#1d2125] text-[#738496] hover:text-[#c7d1db] transition-colors"
                            title="Move back"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}

                        {col.id !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus =
                                col.id === 'backlog'
                                  ? 'todo'
                                  : col.id === 'todo'
                                  ? 'in_progress'
                                  : 'done';
                              handleMoveStatus(task, nextStatus);
                            }}
                            className="p-1 rounded hover:bg-[#1d2125] text-[#738496] hover:text-[#579dff] transition-colors"
                            title="Move forward"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {/* Assignee Avatar */}
                        <div
                          className="w-5 h-5 rounded-full text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: color }}
                          title={`Assigned to ${task.assignee || 'FN'}`}
                        >
                          {initials}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Task Detail Slide-Over Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTask(updated);
        }}
        onTaskDeleted={(taskId) => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setIsDrawerOpen(false);
          setSelectedTask(null);
          showToast('Issue moved to Trash');
        }}
      />
    </div>
  );
};
