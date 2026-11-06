import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus, Project } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Zap,
  CheckSquare,
  Square,
  Sparkles,
  Filter,
  X,
  Clock,
  SlidersHorizontal,
  Bookmark,
  Share2,
  MoreHorizontal,
  FolderGit2,
} from 'lucide-react';

interface TimelineViewProps {
  onOpenQuickAdd?: () => void;
}

type ZoomLevel = 'weeks' | 'months' | 'quarters';

// Month specifications for the 4-month span (Nov 2026 - Feb 2027 = 120 days total)
const TIMELINE_START = new Date('2026-11-01T00:00:00Z').getTime();
const TIMELINE_END = new Date('2027-02-28T23:59:59Z').getTime();
// "Today" is set to mid-November 2026 (Nov 18, 2026) to match the reference screenshot
const TODAY_TIME = new Date('2026-11-18T12:00:00Z').getTime();

export const TimelineView: React.FC<TimelineViewProps> = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string>('Perspective x GPL');
  const [activeTab, setActiveTab] = useState<string>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [isSprintExpanded, setIsSprintExpanded] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('months');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskKey, setNewTaskKey] = useState('');
  const [newTaskEpic, setNewTaskEpic] = useState('Design System');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');
  const [newTaskStart, setNewTaskStart] = useState('2026-11-18');
  const [newTaskDue, setNewTaskDue] = useState('2026-12-05');
  const [newTaskColor, setNewTaskColor] = useState('#388bff');

  const timelineGridRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Fetch tasks and projects from IPC
  const loadTasks = useCallback(async () => {
    try {
      const [allTasks, allProjects] = await Promise.all([
        ipc.getTasks(false),
        ipc.getProjects(),
      ]);
      setTasks(allTasks);
      setProjects(allProjects);
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Scroll to "Today" marker
  const handleScrollToToday = () => {
    if (timelineGridRef.current) {
      const containerWidth = timelineGridRef.current.scrollWidth;
      const todayRatio = (TODAY_TIME - TIMELINE_START) / (TIMELINE_END - TIMELINE_START);
      const scrollPos = todayRatio * containerWidth - timelineGridRef.current.clientWidth / 2;
      timelineGridRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesKey = task.task_key.toLowerCase().includes(q);
        const matchesEpic = task.epic?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesKey && !matchesEpic) return false;
      }

      // Epic filter
      if (selectedEpic !== 'all' && task.epic !== selectedEpic) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && task.status !== selectedStatus) {
        return false;
      }

      // Only my issues toggle (simulate user assigned to even tasks)
      if (onlyMyIssues) {
        const num = parseInt(task.task_key.replace(/\D/g, '') || '0', 10);
        if (num % 2 !== 0) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedEpic, selectedStatus, onlyMyIssues]);

  // Extract unique epics for filter
  const uniqueEpics = useMemo(() => {
    const epics = new Set<string>();
    tasks.forEach((t) => {
      if (t.epic) epics.add(t.epic);
    });
    return Array.from(epics);
  }, [tasks]);

  // Toggle task complete
  const handleToggleTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await ipc.updateTask({
        id: task.id,
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      });
      await loadTasks();
      showToast(newStatus === 'done' ? `Tugas ${task.task_key} selesai! 🎉` : `Tugas ${task.task_key} dibuka kembali`);
    } catch {
      showToast('Gagal memperbarui status');
    }
  };

  // Open edit modal
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  // Save edited task
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await ipc.updateTask({
        id: selectedTask.id,
        title: selectedTask.title,
        description: selectedTask.description || undefined,
        status: selectedTask.status,
        priority: selectedTask.priority,
        starts_at: selectedTask.starts_at || undefined,
        due_at: selectedTask.due_at || undefined,
        epic: selectedTask.epic || undefined,
        color: selectedTask.color || undefined,
      });
      setIsEditModalOpen(false);
      await loadTasks();
      showToast(`Tugas ${selectedTask.task_key} berhasil diperbarui ✨`);
    } catch {
      showToast('Gagal menyimpan perubahan');
    }
  };

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskKey = newTaskKey.trim() || `GPL-${Math.floor(Math.random() * 800 + 70)}`;
    try {
      await ipc.createTask({
        task_key: taskKey,
        title: newTaskTitle.trim(),
        status: newTaskStatus,
        priority: newTaskPriority,
        epic: newTaskEpic,
        starts_at: new Date(newTaskStart).toISOString(),
        due_at: new Date(newTaskDue).toISOString(),
        color: newTaskColor,
      });
      setIsCreateModalOpen(false);
      setNewTaskTitle('');
      setNewTaskKey('');
      await loadTasks();
      showToast(`Tugas ${taskKey} berhasil ditambahkan! 🚀`);
    } catch {
      showToast('Gagal membuat tugas');
    }
  };

  // Compute Gantt bar position
  const getGanttBarStyle = (task: Task) => {
    const start = task.starts_at ? new Date(task.starts_at).getTime() : TIMELINE_START;
    const due = task.due_at ? new Date(task.due_at).getTime() : start + 7 * 24 * 3600 * 1000;

    const leftPercent = Math.max(0, Math.min(100, ((start - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));
    const rightPercent = Math.max(0, Math.min(100, ((due - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));
    const widthPercent = Math.max(2.5, rightPercent - leftPercent);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Calculate today line position
  const todayPercent = Math.max(0, Math.min(100, ((TODAY_TIME - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));

  // Determine grid container min-width according to zoom level
  const gridMinWidth = zoomLevel === 'weeks' ? 'min-w-[1900px]' : zoomLevel === 'quarters' ? 'min-w-[850px]' : 'min-w-[1100px]';

  return (
    <div className="flex flex-col h-full w-full bg-[#101216] text-[#c1c7d0] select-none overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-8 z-50 bg-[#1d212a] border border-[#262933] text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-[#579dff]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER: Project info, Avatars, Create button */}
      <header className="px-6 py-3.5 border-b border-[#262933] bg-[#14161b] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 font-bold text-sm">
            <FolderGit2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={activeProject}
                  onChange={(e) => setActiveProject(e.target.value)}
                  className="text-base font-bold text-white tracking-tight bg-transparent pr-6 focus:outline-none cursor-pointer appearance-none hover:text-[#579dff] transition-colors"
                >
                  <option value="Perspective x GPL" className="bg-[#14161b] text-white">Perspective x GPL</option>
                  {projects.filter(p => p.name !== 'Perspective x GPL').map((p) => (
                    <option key={p.id} value={p.name} className="bg-[#14161b] text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#8993a4] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#1f242f] text-[#579dff] border border-[#2c384e]">
                Software Project
              </span>
            </div>
            <p className="text-[11px] text-[#8993a4]">SaaS Enterprise Platform • Sprint 1 (Active)</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Team Avatars */}
          <div className="flex items-center -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-violet-600 border-2 border-[#14161b] flex items-center justify-center text-[10px] font-bold text-white" title="Fawwaz (Lead)">
              FW
            </div>
            <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-[#14161b] flex items-center justify-center text-[10px] font-bold text-white" title="Mirza (Backend)">
              MR
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-600 border-2 border-[#14161b] flex items-center justify-center text-[10px] font-bold text-white" title="Akbar (Frontend)">
              AK
            </div>
            <div className="w-7 h-7 rounded-full bg-rose-600 border-2 border-[#14161b] flex items-center justify-center text-[10px] font-bold text-white" title="Dara (Design)">
              DR
            </div>
            <div className="w-7 h-7 rounded-full bg-[#282e39] border-2 border-[#14161b] flex items-center justify-center text-[10px] font-bold text-[#8993a4]">
              +3
            </div>
          </div>

          <div className="h-5 w-[1px] bg-[#262933]" />

          <button className="p-1.5 text-[#8993a4] hover:text-white rounded hover:bg-[#1d212a] transition-colors" title="Bookmark project">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-[#8993a4] hover:text-white rounded hover:bg-[#1d212a] transition-colors" title="Share project">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-[#8993a4] hover:text-white rounded hover:bg-[#1d212a] transition-colors" title="More actions">
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Jira-style Blue + Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#579dff] hover:bg-[#68a4ff] text-[#101216] font-semibold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>
      </header>

      {/* VIEW TABS: Summary, List, Board, Calendar, Timeline (Active), Docs, Backlog */}
      <div className="px-6 border-b border-[#262933] bg-[#14161b] flex items-center space-x-6 text-xs flex-shrink-0">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'list', label: 'List' },
          { id: 'board', label: 'Board' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'docs', label: 'Docs' },
          { id: 'backlog', label: 'Backlog' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 font-medium border-b-2 transition-colors relative ${
                isActive
                  ? 'border-[#579dff] text-[#579dff] font-semibold'
                  : 'border-transparent text-[#8993a4] hover:text-[#c1c7d0] hover:border-[#384152]'
              }`}
            >
              {tab.label}
              {tab.id === 'timeline' && (
                <span className="ml-1.5 px-1 py-0.2 text-[9px] rounded bg-[#579dff]/15 text-[#579dff] font-semibold">
                  Gantt
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TOOLBAR: Search, Assignee quick filters, Epic/Type/Status dropdowns */}
      <div className="px-6 py-2.5 bg-[#14161b] border-b border-[#262933] flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* Search Timeline Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8993a4] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline"
              className="bg-[#181b21] border border-[#262933] text-xs text-white rounded-md pl-8 pr-7 py-1.5 w-52 placeholder:text-[#5f687a] focus:outline-none focus:border-[#579dff] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8993a4] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Assignee Circle Filter */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setOnlyMyIssues((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                onlyMyIssues
                  ? 'bg-[#579dff]/15 text-[#579dff] border-[#579dff]/40'
                  : 'bg-[#181b21] text-[#8993a4] border-[#262933] hover:text-white'
              }`}
            >
              Only my issues
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#262933]" />

          {/* Epic Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedEpic}
              onChange={(e) => setSelectedEpic(e.target.value)}
              className="bg-[#181b21] border border-[#262933] text-xs text-[#c1c7d0] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#579dff] cursor-pointer appearance-none pr-7"
            >
              <option value="all">Epic: All</option>
              {uniqueEpics.map((epic) => (
                <option key={epic} value={epic}>
                  {epic}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#8993a4] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#181b21] border border-[#262933] text-xs text-[#c1c7d0] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#579dff] cursor-pointer appearance-none pr-7"
            >
              <option value="all">Type: All</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#8993a4] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Category Dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#181b21] border border-[#262933] text-xs text-[#c1c7d0] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#579dff] cursor-pointer appearance-none pr-7"
            >
              <option value="all">Status category: All</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="backlog">Backlog</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#8993a4] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {(selectedEpic !== 'all' || selectedStatus !== 'all' || selectedType !== 'all' || searchQuery || onlyMyIssues) && (
            <button
              onClick={() => {
                setSelectedEpic('all');
                setSelectedStatus('all');
                setSelectedType('all');
                setSearchQuery('');
                setOnlyMyIssues(false);
              }}
              className="text-xs text-[#579dff] hover:underline flex items-center gap-1"
            >
              <Filter className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Right tools */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setIsSprintExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181b21] border border-[#262933] text-[#8993a4] hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isSprintExpanded ? 'Collapse sprint' : 'Expand sprint'}</span>
          </button>
        </div>
      </div>

      {/* MAIN TIMELINE SPLIT WORKSPACE: Left Work Tree + Right Gantt Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: WORK TREE */}
        <div className="w-96 flex-shrink-0 flex flex-col border-r border-[#262933] bg-[#14161b] overflow-hidden">
          {/* Work Tree Header */}
          <div className="h-10 px-4 border-b border-[#262933] flex items-center justify-between text-xs font-semibold text-[#8993a4] bg-[#14161b]">
            <span className="uppercase tracking-wider text-[10px]">Work item</span>
            <span className="text-[10px] text-[#5f687a]">Key & Status</span>
          </div>

          {/* Work Items Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e222b]">
            {/* SPRINT HEADER ROW */}
            <div
              onClick={() => setIsSprintExpanded(!isSprintExpanded)}
              className="px-3 py-2.5 bg-[#181b21]/70 hover:bg-[#181b21] flex items-center justify-between cursor-pointer border-b border-[#262933] transition-colors"
            >
              <div className="flex items-center space-x-2">
                {isSprintExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8993a4]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8993a4]" />
                )}
                <span className="text-xs font-semibold text-white tracking-wide">
                  Sprints &gt; Sprint 1
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-[#8993a4] font-mono">1 Nov - 28 Feb</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#262933] text-[10px] font-bold text-[#c1c7d0]">
                  {filteredTasks.length} issues
                </span>
              </div>
            </div>

            {/* SPRINT TASKS LIST */}
            {isSprintExpanded && (
              <div>
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8993a4] italic">
                    Tidak ada tugas yang sesuai dengan filter.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isDone = task.status === 'done';
                    const isStory = task.epic?.toLowerCase().includes('sprint') || task.epic?.toLowerCase().includes('design');

                    // Colored status indicator line under each task
                    const statusColor = task.color || '#388bff';

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group h-11 px-3 flex items-center justify-between hover:bg-[#1c2027] cursor-pointer transition-colors relative"
                      >
                        {/* Status color indicator bar on left border edge */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px]"
                          style={{ backgroundColor: statusColor }}
                        />

                        {/* Left: Checkbox, Issue Icon, Key & Title */}
                        <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                          {/* Quick Toggle Checkbox */}
                          <button
                            onClick={(e) => handleToggleTask(task, e)}
                            className="text-[#8993a4] hover:text-white transition-colors flex-shrink-0"
                            title={isDone ? 'Mark as to do' : 'Mark as done'}
                          >
                            {isDone ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#36b37e]" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-[#8993a4] group-hover:text-white" />
                            )}
                          </button>

                          {/* Issue Type Icon: Lightning or Check */}
                          {isStory ? (
                            <Zap className="w-3.5 h-3.5 text-[#8777d9] flex-shrink-0" />
                          ) : (
                            <CheckSquare className="w-3.5 h-3.5 text-[#388bff] flex-shrink-0" />
                          )}

                          {/* Key and Title with colored underline */}
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-xs font-semibold text-[#8993a4] group-hover:text-[#579dff] flex-shrink-0">
                                {task.task_key}
                              </span>
                              <span
                                className={`text-xs truncate ${
                                  isDone ? 'line-through text-[#6b778c]' : 'text-slate-200'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>

                            {/* Status indicator line under task title */}
                            <div
                              className="h-[2px] rounded-full mt-0.5 opacity-80"
                              style={{
                                backgroundColor: statusColor,
                                width: `${Math.min(100, Math.max(30, task.title.length * 5))}px`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Right: Status Pill */}
                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              task.status === 'done'
                                ? 'bg-[#36b37e]/20 text-[#36b37e]'
                                : task.status === 'in_progress'
                                ? 'bg-[#388bff]/20 text-[#579dff]'
                                : task.status === 'todo'
                                ? 'bg-[#ffab00]/20 text-[#ffab00]'
                                : 'bg-[#262933] text-[#8993a4]'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT AREA: TIMELINE GANTT GRID */}
        <div
          ref={timelineGridRef}
          className="flex-1 flex flex-col bg-[#101216] overflow-x-auto overflow-y-auto relative"
        >
          {/* Timeline Grid Container */}
          <div className={`flex flex-col h-full ${gridMinWidth} relative`}>
            {/* MONTH HEADER COLUMNS */}
            <div className="h-10 border-b border-[#262933] bg-[#14161b] flex items-stretch text-xs font-medium text-[#8993a4] flex-shrink-0 sticky top-0 z-30">
              {/* November 2026 (Active) */}
              <div className="w-[25%] border-r border-[#262933] px-3 py-1 flex flex-col justify-center bg-[#181b21]/40">
                <div className="flex items-center justify-between text-white font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#579dff]" />
                    November 2026
                  </span>
                  <span className="text-[10px] text-[#579dff] uppercase font-bold tracking-wider">
                    Current
                  </span>
                </div>
                <div className="flex justify-between text-[9px] text-[#5f687a] font-mono mt-0.5">
                  <span>1 Nov</span>
                  <span>8 Nov</span>
                  <span>15 Nov</span>
                  <span>22 Nov</span>
                  <span>29 Nov</span>
                </div>
              </div>

              {/* December 2026 */}
              <div className="w-[25.83%] border-r border-[#262933] px-3 py-1 flex flex-col justify-center">
                <div className="text-[#c1c7d0] font-semibold">December 2026</div>
                <div className="flex justify-between text-[9px] text-[#5f687a] font-mono mt-0.5">
                  <span>6 Dec</span>
                  <span>13 Dec</span>
                  <span>20 Dec</span>
                  <span>27 Dec</span>
                </div>
              </div>

              {/* January 2027 */}
              <div className="w-[25.83%] border-r border-[#262933] px-3 py-1 flex flex-col justify-center">
                <div className="text-[#c1c7d0] font-semibold">January 2027</div>
                <div className="flex justify-between text-[9px] text-[#5f687a] font-mono mt-0.5">
                  <span>3 Jan</span>
                  <span>10 Jan</span>
                  <span>17 Jan</span>
                  <span>24 Jan</span>
                </div>
              </div>

              {/* February 2027 */}
              <div className="w-[23.34%] px-3 py-1 flex flex-col justify-center">
                <div className="text-[#c1c7d0] font-semibold">February 2027</div>
                <div className="flex justify-between text-[9px] text-[#5f687a] font-mono mt-0.5">
                  <span>1 Feb</span>
                  <span>8 Feb</span>
                  <span>15 Feb</span>
                  <span>22 Feb</span>
                </div>
              </div>
            </div>

            {/* VERTICAL "TODAY" MARKER (Mid-November 2026) */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
              style={{ left: `${todayPercent}%` }}
            >
              <div className="sticky top-0 bg-[#579dff] text-[#101216] font-bold text-[9px] uppercase px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                Today (18 Nov)
              </div>
              <div className="w-[2px] flex-1 bg-[#579dff] shadow-[0_0_8px_rgba(87,157,255,0.7)]" />
            </div>

            {/* VERTICAL COLUMN BACKGROUND GRID LINES */}
            <div className="absolute inset-0 top-10 pointer-events-none flex z-0">
              <div className="w-[25%] border-r border-[#1a1e26]" />
              <div className="w-[25.83%] border-r border-[#1a1e26]" />
              <div className="w-[25.83%] border-r border-[#1a1e26]" />
              <div className="w-[23.34%]" />
            </div>

            {/* SPRINT ROW CORRESPONDING BACKGROUND */}
            <div className="h-[41px] border-b border-[#262933] bg-[#14161b]/30 flex items-center px-4 relative z-10 flex-shrink-0">
              {/* Sprint 1 Span Bar */}
              <div
                className="absolute h-6 rounded-md bg-[#222731] border border-[#384152] flex items-center px-2 text-[10px] font-semibold text-[#8993a4]"
                style={{ left: '0.8%', width: '98%' }}
              >
                Sprint 1 Execution Window (Nov 2026 - Feb 2027)
              </div>
            </div>

            {/* TASKS GANTT BARS (Height: 44px each, perfectly aligned with left work tree rows) */}
            {isSprintExpanded && (
              <div className="flex flex-col relative z-10">
                {filteredTasks.map((task) => {
                  const barStyle = getGanttBarStyle(task);
                  const isDone = task.status === 'done';
                  const barColor = task.color || '#388bff';

                  return (
                    <div
                      key={task.id}
                      className="h-11 border-b border-[#1b1f28]/70 flex items-center relative hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Rounded Pill Duration Bar */}
                      <div
                        onClick={() => handleTaskClick(task)}
                        style={{
                          left: barStyle.left,
                          width: barStyle.width,
                          backgroundColor: barColor,
                        }}
                        className={`absolute h-7 rounded-full shadow-md flex items-center justify-between px-2.5 text-xs font-semibold cursor-pointer transition-all duration-150 hover:brightness-110 hover:scale-[1.01] hover:shadow-lg hover:z-20 ${
                          isDone ? 'opacity-85 ring-1 ring-white/20' : 'ring-1 ring-black/20'
                        }`}
                        title={`${task.task_key} - ${task.title}`}
                      >
                        <div className="flex items-center space-x-1.5 truncate pr-1">
                          <span className="text-[11px] font-mono text-white/95 font-bold drop-shadow-sm">
                            {task.task_key}
                          </span>
                          <span className="text-[11px] text-white truncate drop-shadow-sm font-medium">
                            {task.title}
                          </span>
                        </div>

                        {/* Assignee Avatar Inside Bar */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <div className="w-5 h-5 rounded-full bg-black/30 border border-white/30 flex items-center justify-center text-[9px] font-bold text-white shadow-inner">
                            {task.task_key.slice(-2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR: Today, Weeks, Months (active), Quarters */}
      <footer className="h-10 px-6 border-t border-[#262933] bg-[#14161b] flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* "Today" button to center timeline */}
          <button
            onClick={handleScrollToToday}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181b21] hover:bg-[#202530] text-[#579dff] border border-[#2c384e] font-semibold text-xs transition-colors"
          >
            <Clock className="w-3 h-3 text-[#579dff]" />
            <span>Today</span>
          </button>

          <span className="text-[11px] text-[#8993a4]">
            Showing {filteredTasks.length} of {tasks.length} issues
          </span>
        </div>

        {/* Zoom Controls: Weeks, Months (active), Quarters */}
        <div className="flex items-center space-x-1 bg-[#181b21] p-0.5 rounded-md border border-[#262933]">
          {(['weeks', 'months', 'quarters'] as ZoomLevel[]).map((level) => {
            const isActive = zoomLevel === level;
            return (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-all ${
                  isActive
                    ? 'bg-[#579dff] text-[#101216] font-bold shadow-sm'
                    : 'text-[#8993a4] hover:text-[#c1c7d0]'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </footer>

      {/* COMPACT TASK EDIT / PREVIEW MODAL */}
      {isEditModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#181b21] border border-[#262933] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#262933] flex items-center justify-between bg-[#14161b]">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#579dff]">
                  {selectedTask.task_key}
                </span>
                <span className="text-xs text-[#8993a4]">/</span>
                <span className="text-xs text-[#8993a4]">{selectedTask.epic || 'Task'}</span>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#8993a4] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, title: e.target.value })
                  }
                  className="w-full bg-[#101216] border border-[#262933] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#579dff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#579dff]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="backlog">Backlog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#579dff]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={selectedTask.starts_at ? selectedTask.starts_at.slice(0, 10) : ''}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={selectedTask.due_at ? selectedTask.due_at.slice(0, 10) : ''}
                    onChange={(e) =>
                      setSelectedTask({
                        ...selectedTask,
                        due_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                  Epic / Category
                </label>
                <input
                  type="text"
                  value={selectedTask.epic || ''}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, epic: e.target.value })
                  }
                  placeholder="e.g. Design Sprint, Core Setup, Auth Module"
                  className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#579dff]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={selectedTask.description || ''}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, description: e.target.value })
                  }
                  placeholder="Detailed notes or acceptance criteria..."
                  className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg p-2.5 focus:outline-none focus:border-[#579dff]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-[#262933]">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Hapus tugas ${selectedTask.task_key}?`)) {
                      await ipc.softDeleteTask(selectedTask.id);
                      setIsEditModalOpen(false);
                      await loadTasks();
                      showToast(`Tugas ${selectedTask.task_key} dihapus`);
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Delete Issue
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#262933] text-xs text-[#c1c7d0] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-[#579dff] hover:bg-[#68a4ff] text-[#101216] font-semibold text-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#181b21] border border-[#262933] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-[#262933] flex items-center justify-between bg-[#14161b]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#579dff]" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Create Issue in Perspective x GPL
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#8993a4] hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                  Task Summary / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement Real-time Voice Transcription"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#101216] border border-[#262933] text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#579dff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Issue Key (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="GPL-66"
                    value={newTaskKey}
                    onChange={(e) => setNewTaskKey(e.target.value)}
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#579dff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Epic / Module
                  </label>
                  <select
                    value={newTaskEpic}
                    onChange={(e) => setNewTaskEpic(e.target.value)}
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  >
                    <option value="Design Sprint">Design Sprint</option>
                    <option value="Project Specs">Project Specs</option>
                    <option value="Frontend Core">Frontend Core</option>
                    <option value="Backend Core">Backend Core</option>
                    <option value="Design System">Design System</option>
                    <option value="Auth Module">Auth Module</option>
                    <option value="Web Portal">Web Portal</option>
                    <option value="Core App">Core App</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newTaskStart}
                    onChange={(e) => setNewTaskStart(e.target.value)}
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="backlog">Backlog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-[#101216] border border-[#262933] text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#579dff]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8993a4] uppercase tracking-wider mb-1">
                  Gantt Bar Color
                </label>
                <div className="flex items-center space-x-2">
                  {['#8777d9', '#00b8d9', '#388bff', '#36b37e', '#ffab00', '#ff5630'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTaskColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        newTaskColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#262933]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#262933] text-xs text-[#c1c7d0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#579dff] hover:bg-[#68a4ff] text-[#101216] font-semibold text-xs shadow-sm transition-colors"
                >
                  Create Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
