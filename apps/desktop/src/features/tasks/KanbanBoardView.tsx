import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Zap,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export const KanbanBoardView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    await ipc.updateTask({
      id: task.id,
      status: nextStatus,
      completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
    });
    await loadTasks();
    showToast(`${task.task_key} moved to ${nextStatus.replace('_', ' ').toUpperCase()}`);
  };

  const todoTasks = tasks.filter((t) => t.status === 'todo' || t.status === 'backlog');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const columns = [
    { id: 'todo' as TaskStatus, title: 'TO DO', count: todoTasks.length, items: todoTasks },
    { id: 'in_progress' as TaskStatus, title: 'IN PROGRESS', count: inProgressTasks.length, items: inProgressTasks },
    { id: 'done' as TaskStatus, title: 'DONE', count: doneTasks.length, items: doneTasks },
  ];

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

        <div className="flex items-center space-x-2">
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
              <button className="text-[#738496] hover:text-[#c7d1db]">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cards List */}
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {col.items.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <div
                    key={task.id}
                    className="p-3 bg-[#22272b] hover:bg-[#282e33] border border-[#282e33] rounded-[3px] shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="text-xs font-medium text-[#c7d1db] mb-2 leading-snug">
                      <span className={isDone ? 'line-through text-[#738496]' : ''}>
                        {task.title}
                      </span>
                    </div>

                    {/* Epic Tag */}
                    {task.epic && (
                      <span className="inline-block text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[2px] bg-[#1d2125] text-[#8c9bab] border border-[#282e33] mb-2.5">
                        {task.epic}
                      </span>
                    )}

                    {/* Card Footer: Issue Key, Type Icon, Assignee, Move Action */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#8777d9]" />
                        <span className="font-mono text-[11px] font-semibold text-[#8c9bab] group-hover:text-[#579dff]">
                          {task.task_key}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {col.id !== 'todo' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStatus(task, col.id === 'done' ? 'in_progress' : 'todo');
                            }}
                            className="p-1 rounded hover:bg-[#1d2125] text-[#738496] hover:text-[#c7d1db]"
                            title="Move back"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}
                        {col.id !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStatus(task, col.id === 'todo' ? 'in_progress' : 'done');
                            }}
                            className="p-1 rounded hover:bg-[#1d2125] text-[#738496] hover:text-[#579dff]"
                            title="Move forward"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <div className="w-5 h-5 rounded-full bg-[#de350b] text-white text-[8px] font-bold flex items-center justify-center">
                          {task.task_key.slice(-2)}
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
    </div>
  );
};
