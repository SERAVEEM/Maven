import React, { useState, useEffect, useRef } from 'react';
import { Project } from '@maven/contracts';
import {
  CalendarRange,
  Kanban,
  ListTodo,
  CheckSquare,
  Calendar,
  FileText,
  Bot,
  Search,
  Bell,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Check,
  Sparkles,
  X,
} from 'lucide-react';

export type NavTab =
  | 'timeline'
  | 'board'
  | 'backlog'
  | 'list'
  | 'calendar'
  | 'docs'
  | 'chat'
  | 'projects';

export interface JiraTheme {
  id: string;
  name: string;
  subtitle: string;
  gradient: string;
  accent: string;
  previewBg: string;
}

// ponytail: ambient cover glow wallpapers matching Jira spaces
export const JIRA_THEMES: JiraTheme[] = [
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    subtitle: 'Warm reddish glow (Default)',
    gradient: 'radial-gradient(ellipse 75% 45% at 38% -6%, rgba(195, 45, 30, 0.22), transparent 72%)',
    accent: '#de350b',
    previewBg: '#4a1d1d',
  },
  {
    id: 'charcoal',
    name: 'Charcoal Slate',
    subtitle: 'Classic clean dark canvas',
    gradient: 'none',
    accent: '#8c9bab',
    previewBg: '#22272b',
  },
  {
    id: 'ocean',
    name: 'Deep Pacific',
    subtitle: 'Electric midnight blue aura',
    gradient: 'radial-gradient(ellipse 75% 45% at 38% -6%, rgba(59, 130, 246, 0.20), transparent 72%)',
    accent: '#579dff',
    previewBg: '#1c2e4a',
  },
  {
    id: 'aurora',
    name: 'Boreal Aurora',
    subtitle: 'Nordic emerald ambient',
    gradient: 'radial-gradient(ellipse 75% 45% at 38% -6%, rgba(16, 185, 129, 0.18), transparent 72%)',
    accent: '#10b981',
    previewBg: '#1b3b2f',
  },
  {
    id: 'sunset',
    name: 'Solar Amber',
    subtitle: 'Warm dusk twilight glow',
    gradient: 'radial-gradient(ellipse 75% 45% at 38% -6%, rgba(245, 158, 11, 0.18), transparent 72%)',
    accent: '#f59e0b',
    previewBg: '#45311b',
  },
  {
    id: 'amethyst',
    name: 'Starlight Violet',
    subtitle: 'Cosmic purple mystery',
    gradient: 'radial-gradient(ellipse 75% 45% at 38% -6%, rgba(147, 51, 234, 0.20), transparent 72%)',
    accent: '#a855f7',
    previewBg: '#361e47',
  },
];

interface AppLayoutProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCreate?: () => void;
  projects?: Project[];
  activeProjectId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
  backlogCount?: number;
  notificationCount?: number;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onTabChange,
  onOpenCreate,
  projects = [],
  activeProjectId = null,
  onSelectProject,
  backlogCount = 0,
  notificationCount = 0,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(true);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // ponytail: theme persistence in localStorage
  const [bgTheme, setBgTheme] = useState<string>(() => {
    return localStorage.getItem('maven_jira_bg_theme') || 'nebula';
  });
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themePopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themePopoverRef.current && !themePopoverRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectMenuOpen(false);
      }
    };
    if (isThemeOpen || isProjectMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeOpen, isProjectMenuOpen]);

  const handleSelectTheme = (themeId: string) => {
    setBgTheme(themeId);
    localStorage.setItem('maven_jira_bg_theme', themeId);
  };

  const currentTheme = JIRA_THEMES.find((t) => t.id === bgTheme) || JIRA_THEMES[0]!;

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeWorkspaceName = activeProject ? activeProject.name : 'Personal Workspace (All)';
  const activeWorkspaceColor = activeProject ? (activeProject.color || '#579dff') : '#216e4e';
  const activeWorkspaceInitial = activeProject ? activeProject.name[0]?.toUpperCase() || 'P' : 'P';

  const navItems = [
    { id: 'timeline' as NavTab, label: 'Timeline', icon: CalendarRange, badge: null },
    { id: 'board' as NavTab, label: 'Board', icon: Kanban, badge: null },
    {
      id: 'backlog' as NavTab,
      label: 'Backlog',
      icon: ListTodo,
      badge: backlogCount > 0 ? String(backlogCount) : null,
    },
    { id: 'list' as NavTab, label: 'List', icon: CheckSquare, badge: null },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar, badge: null },
    { id: 'docs' as NavTab, label: 'Docs', icon: FileText, badge: null },
    { id: 'chat' as NavTab, label: 'AI Assistant', icon: Bot, badge: 'NLP' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1d2125] text-[#b6c2cf] select-none font-sans">
      {/* 1. TOP GLOBAL NAVIGATION HEADER (Height 48px, bg #161a1d, border-b #282e33) */}
      <header className="h-12 flex-shrink-0 bg-[#161a1d] border-b border-[#282e33] px-3 flex items-center justify-between text-xs z-40">
        {/* Left: MAVEN brand, Working Projects shortcut, "+ Create" button */}
        <div className="flex items-center space-x-2">
          {/* MAVEN geometric mark + brand */}
          <div className="flex items-center space-x-2 px-1 py-1 mr-1">
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#579dff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-bold text-sm tracking-tight text-[#b6c2cf]">MAVEN</span>
          </div>

          {/* Working Projects shortcut button */}
          <button
            onClick={() => onTabChange('projects')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors ${
              currentTab === 'projects' ? 'bg-[#22272b] text-[#579dff]' : 'text-[#8c9bab]'
            }`}
          >
            <span>Projects</span>
          </button>

          {/* Jira Standard Blue "+ Create" Button */}
          <button
            onClick={onOpenCreate}
            className="bg-[#579dff] hover:bg-[#85b8ff] active:bg-[#388bff] text-[#1d2125] font-semibold text-xs px-3 py-1 rounded-[3px] flex items-center gap-1 transition-colors ml-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>

        {/* Right: Global search bar, notifications, wallpaper switcher, settings, user avatar */}
        <div className="flex items-center space-x-2">
          {/* Global Search Bar (Enter triggers Create / Command Palette) */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#738496] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenCreate?.();
              }}
              className="bg-[#22272b] border border-[#282e33] text-xs w-72 md:w-80 text-[#b6c2cf] placeholder-[#738496] rounded-[3px] pl-8 pr-3 py-1 focus:outline-none focus:border-[#579dff] focus:ring-1 focus:ring-[#579dff] transition-all"
            />
          </div>

          {/* Notifications Bell (render badge ONLY when notificationCount > 0) */}
          <button
            className="relative p-1.5 rounded-[3px] hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-[#de350b] text-white text-[9px] font-bold rounded-full px-1 min-w-[15px] h-[14px] flex items-center justify-center leading-none border border-[#161a1d]">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Workspace Background Wallpaper / Glow Switcher */}
          <div className="relative" ref={themePopoverRef}>
            <button
              onClick={() => setIsThemeOpen((prev) => !prev)}
              className={`p-1.5 rounded-[3px] transition-colors flex items-center gap-1.5 ${
                isThemeOpen
                  ? 'bg-[#22272b] text-[#579dff]'
                  : 'hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf]'
              }`}
              title="Workspace Wallpaper Glow"
            >
              <Palette className="w-4 h-4" />
              <span
                className="w-2 h-2 rounded-full ring-1 ring-[#161a1d] shadow-sm"
                style={{ backgroundColor: currentTheme.accent }}
              />
            </button>

            {/* Jira Theme Popover Dropdown */}
            {isThemeOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#22272b] border border-[#282e33] rounded-[4px] shadow-2xl z-50 overflow-hidden">
                <div className="p-2.5 border-b border-[#282e33] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#c7d1db] font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#579dff]" />
                    <span>Workspace Wallpaper</span>
                  </div>
                  <button
                    onClick={() => setIsThemeOpen(false)}
                    className="text-[#738496] hover:text-[#b6c2cf] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-1.5 space-y-1 max-h-72 overflow-y-auto">
                  {JIRA_THEMES.map((theme) => {
                    const isSelected = theme.id === bgTheme;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          handleSelectTheme(theme.id);
                          setIsThemeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[3px] text-left transition-colors ${
                          isSelected
                            ? 'bg-[#282e33] border border-[#579dff]/40 text-[#c7d1db]'
                            : 'hover:bg-[#1d2125] text-[#8c9bab] hover:text-[#c7d1db] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-4 h-4 rounded-full border border-[#282e33] flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: theme.accent }}
                          />
                          <div>
                            <div className="text-xs font-medium leading-tight">{theme.name}</div>
                            <div className="text-[10px] text-[#738496] mt-0.5">{theme.subtitle}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#579dff] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Settings cog with tooltip */}
          <button
            className="p-1.5 rounded-[3px] hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf] transition-colors"
            title="Settings (coming in Sprint 6)"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar Circle: "FN" */}
          <div
            className="w-7 h-7 rounded-full bg-[#de350b] flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#282e33] cursor-pointer hover:brightness-110 transition-all flex-shrink-0"
            title="Fawwaz Naufal (FN)"
          >
            FN
          </div>
        </div>
      </header>

      {/* 2. BODY SPLIT: Left Sidebar + Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR (bg #181b1f, border-r #22272b, text #8c9bab) */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-12' : 'w-60'
          } flex-shrink-0 flex flex-col bg-[#181b1f] border-r border-[#22272b] text-xs transition-all duration-200 overflow-hidden relative z-20`}
        >
          {/* Header: Interactive Active Workspace / Project Switcher */}
          <div className="p-3 border-b border-[#282e33] flex items-center justify-between relative" ref={projectMenuRef}>
            {!isSidebarCollapsed ? (
              <div
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className="flex items-center space-x-2.5 min-w-0 cursor-pointer p-1 -m-1 rounded-[3px] hover:bg-[#22272b] transition-colors flex-1"
                title="Switch Workspace / Project"
              >
                {/* Active Workspace / Project Color Swatch */}
                <div
                  className="w-7 h-7 rounded-[3px] flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0 transition-colors"
                  style={{ backgroundColor: activeWorkspaceColor }}
                >
                  {activeWorkspaceInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-[#738496] tracking-wider leading-none mb-0.5 flex items-center justify-between">
                    <span>Workspaces</span>
                    <ChevronDown className="w-3 h-3 text-[#738496]" />
                  </div>
                  <h2 className="font-semibold text-xs text-[#c7d1db] truncate leading-tight">
                    {activeWorkspaceName}
                  </h2>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                className="w-7 h-7 mx-auto rounded-[3px] flex items-center justify-center text-white font-bold text-xs cursor-pointer shadow-sm transition-colors"
                style={{ backgroundColor: activeWorkspaceColor }}
                title={`Active: ${activeWorkspaceName}`}
              >
                {activeWorkspaceInitial}
              </div>
            )}

            {/* Collapse toggle button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-[3px] hover:bg-[#22272b] text-[#738496] hover:text-[#b6c2cf] transition-colors ml-1"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Active Workspace / Project Switcher Popover */}
            {isProjectMenuOpen && (
              <div className="absolute left-2 top-full mt-1 w-56 bg-[#22272b] border border-[#282e33] rounded-[4px] shadow-2xl z-50 overflow-hidden py-1">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#738496] tracking-wider border-b border-[#282e33]">
                  Select Workspace
                </div>
                <button
                  onClick={() => {
                    onSelectProject?.(null);
                    setIsProjectMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors ${
                    activeProjectId === null
                      ? 'bg-[#282e33] text-[#579dff] font-semibold'
                      : 'text-[#c7d1db] hover:bg-[#1d2125]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-3 h-3 rounded-[2px] bg-[#216e4e] flex-shrink-0" />
                    <span className="truncate">Personal Workspace (All)</span>
                  </div>
                  {activeProjectId === null && <Check className="w-3.5 h-3.5 text-[#579dff]" />}
                </button>

                {projects.length > 0 && (
                  <>
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-[#738496] tracking-wider border-t border-[#282e33] mt-1">
                      Projects
                    </div>
                    {projects.map((project) => {
                      const isSelected = activeProjectId === project.id;
                      return (
                        <button
                          key={project.id}
                          onClick={() => {
                            onSelectProject?.(project.id);
                            setIsProjectMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors ${
                            isSelected
                              ? 'bg-[#282e33] text-[#579dff] font-semibold'
                              : 'text-[#c7d1db] hover:bg-[#1d2125]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span
                              className="w-3 h-3 rounded-[2px] flex-shrink-0"
                              style={{ backgroundColor: project.color || '#579dff' }}
                            />
                            <span className="truncate">{project.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#579dff]" />}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {/* Section: PLANNING */}
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsPlanningOpen(!isPlanningOpen)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#738496] hover:text-[#b6c2cf]"
              >
                <span>Planning</span>
                {isPlanningOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            )}

            {isPlanningOpen &&
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-2.5'
                    } py-1.5 rounded-[3px] text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#22272b] text-[#579dff] font-semibold border-l-[3px] border-[#579dff]'
                        : 'text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? 'text-[#579dff]' : 'text-[#8c9bab]'
                        }`}
                      />
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isSidebarCollapsed && item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          isActive
                            ? 'bg-[#579dff]/20 text-[#579dff]'
                            : 'bg-[#22272b] text-[#738496]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

            {/* Bottom Tools & Workspaces Section */}
            {!isSidebarCollapsed && (
              <div className="pt-3 mt-2 border-t border-[#282e33] space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#738496]">
                  Workspaces
                </div>

                <button
                  onClick={() => onTabChange('projects')}
                  className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-[3px] text-xs transition-colors ${
                    currentTab === 'projects'
                      ? 'bg-[#22272b] text-[#579dff] font-semibold border-l-[3px] border-[#579dff]'
                      : 'text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]/60'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 text-[#8c9bab]" />
                  <span>Projects</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* 3. MAIN WORK AREA (bg #1d2125 + dynamic ambient theme glow) */}
        <main
          className="flex-1 flex flex-col h-full overflow-hidden bg-[#1d2125] transition-all duration-300 relative"
          style={{
            backgroundImage: currentTheme.gradient !== 'none' ? currentTheme.gradient : undefined,
            backgroundColor: '#1d2125',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
