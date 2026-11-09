import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  TaskDetailDrawer,
  getMemberInitials,
  getMemberColor,
} from './TaskDetailDrawer';
import {
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';

export const BacklogView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSprintOpen, setIsSprintOpen] = useState(true);
  const [isBacklogPoolOpen, setIsBacklogPoolOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    const list = await ipc.getTasks(false);
    setTasks(list);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const sprintTasks = tasks.filter((t) => t.status !== 'backlog');
  const backlogPoolTasks = tasks.filter((t) => t.status === 'backlog');

  const handleRowClick = (task: Task) => {
    setSelectedTask(task);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent text-[#b6c2cf] font-sans select-none">
      {/* Backlog Header */}
      <div className="px-6 py-3 border-b border-[#282e33] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#8c9bab]">
            <span>Spaces</span>
            <span>&gt;</span>
            <span className="text-[#c7d1db] font-semibold">Perspective x GPL</span>
            <span>&gt;</span>
            <span>Backlog</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#c7d1db] mt-1">
            Backlog & Sprint Planning
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 rounded-[3px] bg-[#579dff] text-[#1d2125] font-semibold text-xs shadow-sm hover:bg-[#85b8ff] transition-colors">
            Complete sprint
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* SPRINT 1 SECTION */}
        <div className="bg-[#161a1d] border border-[#282e33] rounded-[4px] overflow-hidden">
          {/* Sprint Accordion Header */}
          <div
            onClick={() => setIsSprintOpen(!isSprintOpen)}
            className="px-4 py-2.5 bg-[#181b1f] border-b border-[#282e33] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-xs">
              {isSprintOpen ? (
                <ChevronDown className="w-4 h-4 text-[#8c9bab]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8c9bab]" />
              )}
              <span className="font-bold text-[#c7d1db]">Sprint 1</span>
              <span className="text-[#738496] font-mono text-[11px]">1 Nov - 28 Feb</span>
              <span className="px-2 py-0.5 rounded-[3px] bg-[#22272b] text-[#579dff] text-[10px] font-semibold border border-[#282e33]">
                {sprintTasks.length} issues
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.2 rounded bg-[#0055cc]/30 text-[#579dff] text-[10px] font-bold">
                {sprintTasks.filter((t) => t.status === 'in_progress').length} In Progress
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#216e4e]/30 text-[#4bce97] text-[10px] font-bold">
                {sprintTasks.filter((t) => t.status === 'done').length} Done
              </span>
            </div>
          </div>

          {/* Sprint Issues List */}
          {isSprintOpen && (
            <div className="divide-y divide-[#282e33]">
              {sprintTasks.map((task) => {
                const initials = getMemberInitials(task.assignee);
                const color = getMemberColor(initials);
                return (
                  <div
                    key={task.id}
                    onClick={() => handleRowClick(task)}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-[#22272b] text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <Zap className="w-3.5 h-3.5 text-[#8777d9] flex-shrink-0 fill-[#8777d9]/20" />
                      <span className="font-mono text-xs font-semibold text-[#8c9bab] group-hover:text-[#579dff]">
                        {task.task_key}
                      </span>
                      <span
                        className={`truncate ${
                          task.status === 'done' ? 'line-through text-[#738496]' : 'text-[#c7d1db]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      {task.epic && (
                        <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-[#22272b] text-[#8c9bab] border border-[#282e33]">
                          {task.epic}
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] border ${
                          task.status === 'done'
                            ? 'bg-[#216e4e]/20 text-[#4bce97] border-[#216e4e]/40'
                            : task.status === 'in_progress'
                            ? 'bg-[#0055cc]/20 text-[#579dff] border-[#0055cc]/40'
                            : 'bg-[#7f5f01]/20 text-[#f5cd47] border-[#7f5f01]/40'
                        }`}
                      >
                        {task.status.replace('_', ' ')}
                      </span>
                      <div
                        className="w-5 h-5 rounded-full text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={task.assignee || 'FN'}
                      >
                        {initials}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BACKLOG POOL SECTION */}
        <div className="bg-[#161a1d] border border-[#282e33] rounded-[4px] overflow-hidden">
          <div
            onClick={() => setIsBacklogPoolOpen(!isBacklogPoolOpen)}
            className="px-4 py-2.5 bg-[#181b1f] border-b border-[#282e33] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-xs">
              {isBacklogPoolOpen ? (
                <ChevronDown className="w-4 h-4 text-[#8c9bab]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8c9bab]" />
              )}
              <span className="font-bold text-[#c7d1db]">Backlog Pool</span>
              <span className="px-2 py-0.5 rounded-[3px] bg-[#22272b] text-[#8c9bab] text-[10px] font-semibold border border-[#282e33]">
                {backlogPoolTasks.length} issues
              </span>
            </div>
          </div>

          {isBacklogPoolOpen && (
            <div className="divide-y divide-[#282e33]">
              {backlogPoolTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleRowClick(task)}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-[#22272b] text-xs transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <Zap className="w-3.5 h-3.5 text-[#8777d9] flex-shrink-0 fill-[#8777d9]/20" />
                    <span className="font-mono text-xs font-semibold text-[#8c9bab] group-hover:text-[#579dff]">
                      {task.task_key}
                    </span>
                    <span className="truncate text-[#c7d1db]">{task.title}</span>
                  </div>

                  <div className="flex items-center space-x-3 flex-shrink-0">
                    {task.epic && (
                      <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-[#22272b] text-[#8c9bab] border border-[#282e33]">
                        {task.epic}
                      </span>
                    )}
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] bg-[#22272b] text-[#8c9bab] border border-[#282e33]">
                      BACKLOG
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
        }}
      />
    </div>
  );
};
