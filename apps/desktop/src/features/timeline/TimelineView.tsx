import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Task, TaskStatus } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Zap,
  CheckSquare,
  Square,
  X,
  Share2,
  MoreHorizontal,
  SlidersHorizontal,
} from 'lucide-react';
import { NavTab } from '../../components/layout/AppLayout';

interface TimelineViewProps {
  onTabChange?: (tab: NavTab) => void;
  onOpenCreate?: () => void;
}

type ZoomLevel = 'weeks' | 'months' | 'quarters';

// 5-Month span: October 1, 2026 to February 28, 2027 (151 days total)
const TIMELINE_START = new Date('2026-10-01T00:00:00Z').getTime();
const TIMELINE_END = new Date('2027-02-28T23:59:59Z').getTime();
// "Today" is set to mid-November 2026 (Nov 18, 2026) matching the reference screenshot
const TODAY_TIME = new Date('2026-11-18T12:00:00Z').getTime();

// Team assignees for Jira filter circles and avatars
const TEAM_MEMBERS = [
  { id: 'FN', name: 'Fawwaz Naufal', color: '#de350b' },
  { id: 'RD', name: 'Rangga Dwi', color: '#6e5dc6' },
  { id: 'AB', name: 'Aditya Bagus', color: '#0052cc' },
  { id: 'LA', name: 'Lia Anggraini', color: '#216e4e' },
  { id: 'AS', name: 'Arif Setiawan', color: '#008da6' },
];

export const TimelineView: React.FC<TimelineViewProps> = ({
  onTabChange,
  onOpenCreate,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<string>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isSprintExpanded, setIsSprintExpanded] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('months');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timelineGridRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const allTasks = await ipc.getTasks(false);
      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to load tasks', err);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Scroll to "Today" line
  const handleScrollToToday = () => {
    if (timelineGridRef.current) {
      const containerWidth = timelineGridRef.current.scrollWidth;
      const todayRatio = (TODAY_TIME - TIMELINE_START) / (TIMELINE_END - TIMELINE_START);
      const scrollPos = todayRatio * containerWidth - timelineGridRef.current.clientWidth / 2;
      timelineGridRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  };

  // Filter tasks based on search, epic, status, type, and assignee
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Must be a GPL task or general task
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesKey = task.task_key.toLowerCase().includes(q);
        const matchesEpic = task.epic?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesKey && !matchesEpic) return false;
      }

      if (selectedEpic !== 'all' && task.epic !== selectedEpic) {
        return false;
      }

      if (selectedStatus !== 'all' && task.status !== selectedStatus) {
        return false;
      }

      if (selectedAssignee) {
        // Map task index/key to assignee for realistic filter demo
        const num = parseInt(task.task_key.replace(/\D/g, '') || '0', 10);
        const memberIdx = num % TEAM_MEMBERS.length;
        if (TEAM_MEMBERS[memberIdx]?.id !== selectedAssignee) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedEpic, selectedStatus, selectedAssignee]);

  // Extract unique epics for filter dropdown
  const uniqueEpics = useMemo(() => {
    const epics = new Set<string>();
    tasks.forEach((t) => {
      if (t.epic) epics.add(t.epic);
    });
    return Array.from(epics);
  }, [tasks]);

  // Toggle task complete status
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
      showToast(newStatus === 'done' ? `${task.task_key} marked Done 🎉` : `${task.task_key} reopened`);
    } catch {
      showToast('Status update failed');
    }
  };

  // Open edit modal
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };



  // Compute Gantt bar position across 151 days (Oct 1, 2026 - Feb 28, 2027)
  const getGanttBarStyle = (task: Task) => {
    const start = task.starts_at ? new Date(task.starts_at).getTime() : TIMELINE_START;
    const due = task.due_at ? new Date(task.due_at).getTime() : start + 14 * 24 * 3600 * 1000;

    const leftPercent = Math.max(0, Math.min(100, ((start - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));
    const rightPercent = Math.max(0, Math.min(100, ((due - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));
    const widthPercent = Math.max(2.2, rightPercent - leftPercent);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Assignee helper for each task
  const getTaskAssignee = (task: Task) => {
    const num = parseInt(task.task_key.replace(/\D/g, '') || '0', 10);
    return TEAM_MEMBERS[num % TEAM_MEMBERS.length]!;
  };

  // Calculate today line position (mid-November 2026)
  const todayPercent = Math.max(0, Math.min(100, ((TODAY_TIME - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100));

  // Determine grid container min-width according to zoom level
  const gridMinWidth =
    zoomLevel === 'weeks' ? 'min-w-[2100px]' : zoomLevel === 'quarters' ? 'min-w-[950px]' : 'min-w-[1300px]';

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-[#b6c2cf] select-none overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-8 z-50 bg-[#22272b] border border-[#282e33] text-[#c7d1db] px-3.5 py-2 rounded-[3px] shadow-2xl text-xs font-medium flex items-center gap-2">
          <span className="text-[#579dff]">ℹ</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. BREADCRUMB HEADER: Spaces > Perspective x GPL + Team Avatars */}
      <div className="px-6 pt-3 pb-2 flex items-center justify-between flex-shrink-0 bg-transparent">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[#8c9bab] hover:text-[#c7d1db] cursor-pointer">Spaces</span>
          <span className="text-[#738496]">&gt;</span>
          <div className="flex items-center space-x-1.5 font-semibold text-[#c7d1db]">
            <span className="w-4 h-4 rounded-[2px] bg-[#216e4e] flex items-center justify-center text-[10px] text-white font-bold">
              P
            </span>
            <span>Perspective x GPL</span>
          </div>
        </div>

        {/* Right side: Team avatars stack & Project action icons */}
        <div className="flex items-center space-x-3">
          {/* Team Avatars Stack: FN, RD, AB, LA, AS, +3 */}
          <div className="flex items-center -space-x-1.5">
            {TEAM_MEMBERS.map((m) => (
              <div
                key={m.id}
                style={{ backgroundColor: m.color }}
                className="w-6 h-6 rounded-full border-2 border-[#1d2125] flex items-center justify-center text-[9px] font-bold text-white shadow-sm cursor-pointer hover:scale-110 hover:z-20 transition-transform"
                title={`${m.name} (${m.id})`}
              >
                {m.id}
              </div>
            ))}
            <div
              className="w-6 h-6 rounded-full bg-[#282e33] border-2 border-[#1d2125] flex items-center justify-center text-[9px] font-bold text-[#8c9bab] cursor-pointer hover:scale-110 hover:z-20 transition-transform"
              title="+3 other contributors"
            >
              +3
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#282e33]" />

          <button
            className="p-1 rounded-[3px] text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors"
            title="Share timeline"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded-[3px] text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB BAR: Summary, List, Board, Calendar, Timeline (Active), Docs, Forms, Reports, Backlog, + */}
      <div className="px-6 border-b border-[#282e33] flex items-center space-x-6 text-xs flex-shrink-0 bg-transparent">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'list', label: 'List' },
          { id: 'board', label: 'Board' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'timeline', label: 'Timeline' },
          { id: 'docs', label: 'Docs' },
          { id: 'forms', label: 'Forms' },
          { id: 'reports', label: 'Reports' },
          { id: 'backlog', label: 'Backlog' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                if (onTabChange) {
                  if (tab.id === 'board') onTabChange('board');
                  else if (tab.id === 'backlog') onTabChange('backlog');
                  else if (tab.id === 'list') onTabChange('list');
                  else if (tab.id === 'calendar') onTabChange('calendar');
                  else if (tab.id === 'docs') onTabChange('docs');
                }
              }}
              className={`py-2 font-medium border-b-2 transition-colors relative ${
                isActive
                  ? 'border-[#579dff] text-[#579dff] font-semibold'
                  : 'border-transparent text-[#8c9bab] hover:text-[#c7d1db] hover:border-[#282e33]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={onOpenCreate}
          className="text-[#8c9bab] hover:text-[#c7d1db] p-1 rounded-[3px] hover:bg-[#22272b]"
          title="Add view"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. FILTER TOOLBAR: Search timeline input, avatar circle filters, dropdown buttons */}
      <div className="px-6 py-2 border-b border-[#282e33] flex items-center justify-between flex-wrap gap-2.5 flex-shrink-0 bg-transparent">
        <div className="flex items-center space-x-2.5 flex-wrap gap-2">
          {/* Search Timeline Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#738496] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline"
              className="bg-[#22272b] border border-[#282e33] text-xs text-[#b6c2cf] placeholder-[#738496] rounded-[3px] pl-8 pr-6 py-1 w-44 focus:outline-none focus:border-[#579dff]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#738496] hover:text-[#c7d1db]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Assignee Circle Filter Buttons (FN, RD, AB, LA, AS) */}
          <div className="flex items-center space-x-1">
            {TEAM_MEMBERS.map((m) => {
              const isSelected = selectedAssignee === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedAssignee(isSelected ? null : m.id)}
                  style={{ backgroundColor: m.color }}
                  className={`w-6 h-6 rounded-full text-[9px] font-bold text-white flex items-center justify-center transition-all ${
                    isSelected ? 'ring-2 ring-white scale-110 z-10' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={`Filter by ${m.name}`}
                >
                  {m.id}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-[1px] bg-[#282e33]" />

          {/* Epic Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedEpic}
              onChange={(e) => setSelectedEpic(e.target.value)}
              className="bg-[#22272b] border border-[#282e33] text-xs text-[#c7d1db] rounded-[3px] px-2.5 py-1 focus:outline-none focus:border-[#579dff] cursor-pointer appearance-none pr-6 font-medium"
            >
              <option value="all">Epic</option>
              {uniqueEpics.map((epic) => (
                <option key={epic} value={epic} className="bg-[#1d2125]">
                  {epic}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#738496] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Type Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#22272b] border border-[#282e33] text-xs text-[#c7d1db] rounded-[3px] px-2.5 py-1 focus:outline-none focus:border-[#579dff] cursor-pointer appearance-none pr-6 font-medium"
            >
              <option value="all">Type</option>
              <option value="story" className="bg-[#1d2125]">Story</option>
              <option value="task" className="bg-[#1d2125]">Task</option>
              <option value="bug" className="bg-[#1d2125]">Bug</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#738496] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Category Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#22272b] border border-[#282e33] text-xs text-[#c7d1db] rounded-[3px] px-2.5 py-1 focus:outline-none focus:border-[#579dff] cursor-pointer appearance-none pr-6 font-medium"
            >
              <option value="all">Status category</option>
              <option value="todo" className="bg-[#1d2125]">To Do</option>
              <option value="in_progress" className="bg-[#1d2125]">In Progress</option>
              <option value="done" className="bg-[#1d2125]">Done</option>
              <option value="backlog" className="bg-[#1d2125]">Backlog</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#738496] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters button if any active */}
          {(selectedEpic !== 'all' || selectedStatus !== 'all' || selectedType !== 'all' || searchQuery || selectedAssignee) && (
            <button
              onClick={() => {
                setSelectedEpic('all');
                setSelectedStatus('all');
                setSelectedType('all');
                setSearchQuery('');
                setSelectedAssignee(null);
              }}
              className="text-xs text-[#579dff] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Right side: View settings */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setIsSprintExpanded(!isSprintExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#22272b] border border-[#282e33] text-[#8c9bab] hover:text-[#c7d1db] transition-colors"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isSprintExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN TIMELINE SPLIT WORKSPACE: Work Tree (Left) + Gantt Grid (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: WORK TREE (Width 380px, bg #1d2125, border-r #22272b) */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-[#22272b] bg-[#1d2125] overflow-hidden">
          {/* Header row: "Work" */}
          <div className="h-9 px-4 border-b border-[#282e33] flex items-center justify-between text-xs font-semibold text-[#8c9bab] bg-[#181b1f]">
            <span className="font-semibold text-xs text-[#c7d1db]">Work</span>
            <span className="text-[10px] text-[#738496]">Status</span>
          </div>

          {/* Scrollable Work items list */}
          <div className="flex-1 overflow-y-auto">
            {/* Sprint accordion header: v Sprints > Sprint 1 */}
            <div
              onClick={() => setIsSprintExpanded(!isSprintExpanded)}
              className="h-9 px-3 bg-[#22272b]/70 hover:bg-[#22272b] flex items-center justify-between cursor-pointer border-b border-[#282e33] transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                {isSprintExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#8c9bab]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8c9bab]" />
                )}
                <span className="text-xs font-semibold text-[#c7d1db]">Sprints</span>
                <span className="text-[#738496]">&gt;</span>
                <span className="text-xs font-semibold text-[#579dff]">Sprint 1</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-[#738496]">
                <span>1 Nov - 28 Feb</span>
                <span className="px-1.5 py-0.2 rounded bg-[#181b1f] text-[#8c9bab] font-semibold border border-[#282e33]">
                  {filteredTasks.length} issues
                </span>
              </div>
            </div>

            {/* List of Tasks (Height 38px each, perfectly synchronized with Gantt row) */}
            {isSprintExpanded && (
              <div className="divide-y divide-[#22272b]">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#738496] italic">
                    No matching issues found.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const isDone = task.status === 'done';
                    const statusColor = task.color || '#388bff';

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="group h-[38px] px-3 flex items-center justify-between hover:bg-[#22272b]/60 cursor-pointer transition-colors relative"
                      >
                        {/* Checkbox, Purple Lightning icon, Key & Title with Colored underline */}
                        <div className="flex items-center space-x-2 min-w-0 pr-2 flex-1">
                          {/* Toggle Checkbox */}
                          <button
                            onClick={(e) => handleToggleTask(task, e)}
                            className="text-[#738496] hover:text-[#c7d1db] transition-colors flex-shrink-0"
                            title={isDone ? 'Mark to do' : 'Mark done'}
                          >
                            {isDone ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#4bce97]" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-[#738496] group-hover:text-[#c7d1db]" />
                            )}
                          </button>

                          {/* Purple Lightning Icon for Jira Story */}
                          <Zap className="w-3.5 h-3.5 text-[#8777d9] flex-shrink-0 fill-[#8777d9]/20" />

                          {/* Key and Title with colored underline bar right below */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span className="font-mono text-xs font-semibold text-[#8c9bab] group-hover:text-[#579dff] flex-shrink-0">
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

                            {/* Exact colored indicator underline bar right below each title! */}
                            <div
                              className="h-[2px] rounded-full mt-0.5 opacity-90"
                              style={{
                                backgroundColor: statusColor,
                                width: `${Math.min(120, Math.max(35, task.title.length * 5))}px`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Status Category Pill on right */}
                        <div className="flex-shrink-0">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[3px] border ${
                              task.status === 'done'
                                ? 'bg-[#216e4e]/20 text-[#4bce97] border-[#216e4e]/40'
                                : task.status === 'in_progress'
                                ? 'bg-[#0055cc]/20 text-[#579dff] border-[#0055cc]/40'
                                : task.status === 'todo'
                                ? 'bg-[#7f5f01]/20 text-[#f5cd47] border-[#7f5f01]/40'
                                : 'bg-[#22272b] text-[#8c9bab] border-[#282e33]'
                            }`}
                          >
                            {task.status === 'in_progress'
                              ? 'IN PROGRESS'
                              : task.status === 'todo'
                              ? 'TO DO'
                              : task.status === 'done'
                              ? 'DONE'
                              : 'BACKLOG'}
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

        {/* RIGHT COLUMN: GANTT GRID (Months: October, November, December, January '27, February '27) */}
        <div
          ref={timelineGridRef}
          className="flex-1 flex flex-col bg-[#1d2125] overflow-x-auto overflow-y-auto relative"
        >
          <div className={`flex flex-col h-full ${gridMinWidth} relative`}>
            {/* MONTH HEADER COLUMNS (Sticky top, height 36px) */}
            <div className="h-9 border-b border-[#282e33] bg-[#181b1f] flex items-stretch text-xs font-semibold text-[#8c9bab] flex-shrink-0 sticky top-0 z-30">
              {/* October 2026 (20.53%) */}
              <div className="w-[20.53%] border-r border-[#282e33] px-3 py-1 flex flex-col justify-center">
                <span className="text-[#c7d1db] text-xs">October</span>
                <div className="flex justify-between text-[9px] text-[#738496] font-mono mt-0.5">
                  <span>Oct 4</span>
                  <span>Oct 11</span>
                  <span>Oct 18</span>
                  <span>Oct 25</span>
                </div>
              </div>

              {/* November 2026 (Current Month - 19.87%) */}
              <div className="w-[19.87%] border-r border-[#282e33] px-3 py-1 flex flex-col justify-center bg-[#22272b]/40">
                <div className="flex items-center justify-between text-[#579dff]">
                  <span className="flex items-center gap-1 font-semibold text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#579dff]" />
                    November
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider">Current</span>
                </div>
                <div className="flex justify-between text-[9px] text-[#738496] font-mono mt-0.5">
                  <span>Nov 1</span>
                  <span>Nov 8</span>
                  <span>Nov 15</span>
                  <span>Nov 22</span>
                  <span>Nov 29</span>
                </div>
              </div>

              {/* December 2026 (20.53%) */}
              <div className="w-[20.53%] border-r border-[#282e33] px-3 py-1 flex flex-col justify-center">
                <span className="text-[#c7d1db] text-xs">December</span>
                <div className="flex justify-between text-[9px] text-[#738496] font-mono mt-0.5">
                  <span>Dec 6</span>
                  <span>Dec 13</span>
                  <span>Dec 20</span>
                  <span>Dec 27</span>
                </div>
              </div>

              {/* January '27 (20.53%) */}
              <div className="w-[20.53%] border-r border-[#282e33] px-3 py-1 flex flex-col justify-center">
                <span className="text-[#c7d1db] text-xs">January '27</span>
                <div className="flex justify-between text-[9px] text-[#738496] font-mono mt-0.5">
                  <span>Jan 3</span>
                  <span>Jan 10</span>
                  <span>Jan 17</span>
                  <span>Jan 24</span>
                </div>
              </div>

              {/* February '27 (18.54%) */}
              <div className="w-[18.54%] px-3 py-1 flex flex-col justify-center">
                <span className="text-[#c7d1db] text-xs">February '27</span>
                <div className="flex justify-between text-[9px] text-[#738496] font-mono mt-0.5">
                  <span>Feb 1</span>
                  <span>Feb 8</span>
                  <span>Feb 15</span>
                  <span>Feb 22</span>
                </div>
              </div>
            </div>

            {/* VERTICAL "TODAY" LINE (Mid-November 2026, ~32.12%) */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
              style={{ left: `${todayPercent}%` }}
            >
              <div className="sticky top-0 bg-[#579dff] text-[#1d2125] font-bold text-[9px] px-1.5 py-0.5 rounded-[2px] shadow-md whitespace-nowrap z-30">
                Today (18 Nov)
              </div>
              <div className="w-[1.5px] flex-1 bg-[#579dff] shadow-[0_0_6px_rgba(87,157,255,0.6)]" />
            </div>

            {/* VERTICAL COLUMN GRID LINES */}
            <div className="absolute inset-0 top-9 pointer-events-none flex z-0">
              <div className="w-[20.53%] border-r border-[#22272b]" />
              <div className="w-[19.87%] border-r border-[#22272b]" />
              <div className="w-[20.53%] border-r border-[#22272b]" />
              <div className="w-[20.53%] border-r border-[#22272b]" />
              <div className="w-[18.54%]" />
            </div>

            {/* SPRINT BRACKET ROW (Nov 1 - Feb 28, spans from 20.53% to end) */}
            <div className="h-9 border-b border-[#282e33] bg-[#181b1f]/30 flex items-center relative z-10 flex-shrink-0">
              <div
                className="absolute h-6 rounded-[3px] bg-[#22272b] border border-[#282e33] flex items-center px-2.5 text-[10px] font-semibold text-[#8c9bab] shadow-sm"
                style={{ left: '20.53%', width: '78.5%' }}
              >
                Sprint 1 Window (1 Nov 2026 - 28 Feb 2027)
              </div>
            </div>

            {/* GANTT DURATION BARS ROW BY ROW */}
            {isSprintExpanded && (
              <div className="flex flex-col relative z-10">
                {filteredTasks.map((task) => {
                  const barStyle = getGanttBarStyle(task);
                  const barColor = task.color || '#388bff';
                  const assignee = getTaskAssignee(task);
                  const isDone = task.status === 'done';

                  return (
                    <div
                      key={task.id}
                      className="h-[38px] border-b border-[#22272b]/60 flex items-center relative hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Exact flat rectangular duration bar: rounded-[3px], height 22px, NO pill shape! */}
                      <div
                        onClick={() => handleTaskClick(task)}
                        style={{
                          left: barStyle.left,
                          width: barStyle.width,
                          backgroundColor: barColor,
                        }}
                        className={`absolute h-[22px] rounded-[3px] shadow flex items-center justify-between px-2 text-xs font-semibold cursor-pointer transition-all duration-150 hover:brightness-110 hover:shadow-lg hover:z-20 ${
                          isDone ? 'opacity-85' : ''
                        }`}
                        title={`${task.task_key}: ${task.title}`}
                      >
                        {/* Task key & title */}
                        <div className="flex items-center space-x-1.5 truncate pr-1">
                          <span className="text-[10px] font-mono text-white font-bold drop-shadow-sm flex-shrink-0">
                            {task.task_key}
                          </span>
                          <span className="text-[11px] text-white truncate drop-shadow-sm font-medium">
                            {task.title}
                          </span>
                        </div>

                        {/* Assignee Avatar Circle */}
                        <div
                          style={{ backgroundColor: assignee.color }}
                          className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center border border-white/30 flex-shrink-0 ml-1 shadow-inner"
                          title={assignee.name}
                        >
                          {assignee.id}
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

      {/* 5. BOTTOM CONTROLS TOOLBAR: Today, Weeks, Months (active), Quarters */}
      <footer className="h-10 px-6 border-t border-[#282e33] bg-[#181b1f] flex items-center justify-between text-xs flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleScrollToToday}
            className="px-2.5 py-1 rounded-[3px] bg-[#22272b] hover:bg-[#282e33] text-[#579dff] border border-[#282e33] font-semibold text-xs transition-colors"
          >
            Today
          </button>
          <span className="text-[11px] text-[#738496]">
            Showing {filteredTasks.length} of {tasks.length} issues
          </span>
        </div>

        {/* Zoom Level Switcher */}
        <div className="flex items-center space-x-0.5 bg-[#22272b] p-0.5 rounded-[3px] border border-[#282e33]">
          {(['weeks', 'months', 'quarters'] as ZoomLevel[]).map((level) => {
            const isActive = zoomLevel === level;
            return (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`px-3 py-0.5 rounded-[3px] text-xs font-medium capitalize transition-all ${
                  isActive
                    ? 'bg-[#579dff] text-[#1d2125] font-bold shadow-sm'
                    : 'text-[#8c9bab] hover:text-[#c7d1db]'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </footer>

      {/* 6. JIRA ISSUE DETAIL DRAWER */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={async (updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTask(updated);
          showToast(`${updated.task_key} updated`);
        }}
        onTaskDeleted={async (taskId) => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setIsEditModalOpen(false);
          setSelectedTask(null);
          showToast('Issue moved to Trash');
        }}
      />
    </div>
  );
};
