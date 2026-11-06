import React, { useState } from 'react';
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
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  Users,
  Target,
  FileCode,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
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

interface AppLayoutProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenCreate?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onTabChange,
  onOpenCreate,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPlanningOpen, setIsPlanningOpen] = useState(true);

  const navItems = [
    { id: 'timeline' as NavTab, label: 'Timeline', icon: CalendarRange, badge: null },
    { id: 'board' as NavTab, label: 'Board', icon: Kanban, badge: null },
    { id: 'backlog' as NavTab, label: 'Backlog', icon: ListTodo, badge: '13' },
    { id: 'list' as NavTab, label: 'List', icon: CheckSquare, badge: null },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar, badge: null },
    { id: 'docs' as NavTab, label: 'Docs', icon: FileText, badge: null },
    { id: 'chat' as NavTab, label: 'AI Assistant', icon: Bot, badge: 'NLP' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#1d2125] text-[#b6c2cf] select-none font-sans">
      {/* 1. TOP GLOBAL NAVIGATION HEADER (Height 48px, bg #161a1d, border-b #282e33) */}
      <header className="h-12 flex-shrink-0 bg-[#161a1d] border-b border-[#282e33] px-3 flex items-center justify-between text-xs z-40">
        {/* Left: 9-dot app switcher, Jira logo, dropdowns, "+ Create" button */}
        <div className="flex items-center space-x-2">
          {/* 9-dot App Switcher icon */}
          <button
            className="p-1.5 rounded-[3px] hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf] transition-colors"
            title="Atlassian App Switcher"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="2.5" cy="2.5" r="1.5" />
              <circle cx="8" cy="2.5" r="1.5" />
              <circle cx="13.5" cy="2.5" r="1.5" />
              <circle cx="2.5" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="13.5" cy="8" r="1.5" />
              <circle cx="2.5" cy="13.5" r="1.5" />
              <circle cx="8" cy="13.5" r="1.5" />
              <circle cx="13.5" cy="13.5" r="1.5" />
            </svg>
          </button>

          {/* Jira folded diamonds logo + text "Jira" */}
          <div className="flex items-center space-x-1.5 px-1 py-1 mr-1">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <path
                d="M11.9 1.5C11.9 5.5 8.7 8.7 4.7 8.7H2.2c-.4 0-.7.3-.7.7v3.2c0 4 3.2 7.2 7.2 7.2h3.2c.4 0 .7-.3.7-.7V17c0-4 3.2-7.2 7.2-7.2h2.5c.4 0 .7-.3.7-.7V5.9c0-4-3.2-7.2-7.2-7.2h-3.9z"
                fill="#579dff"
              />
            </svg>
            <span className="font-bold text-sm tracking-tight text-[#b6c2cf]">Jira</span>
          </div>

          {/* Jira Navigation dropdown links */}
          <div className="hidden md:flex items-center space-x-0.5 text-[#8c9bab]">
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors">
              <span>Your work</span>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </button>
            <button
              onClick={() => onTabChange('projects')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors ${
                currentTab === 'projects' ? 'bg-[#22272b] text-[#579dff]' : ''
              }`}
            >
              <span>Projects</span>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors">
              <span>Filters</span>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors">
              <span>Dashboards</span>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors">
              <span>Teams</span>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[3px] hover:bg-[#22272b] hover:text-[#b6c2cf] font-medium transition-colors">
              <span>Apps</span>
              <ChevronDown className="w-3 h-3 text-[#738496]" />
            </button>
          </div>

          {/* Jira Standard Blue "+ Create" Button */}
          <button
            onClick={onOpenCreate}
            className="bg-[#579dff] hover:bg-[#85b8ff] active:bg-[#388bff] text-[#1d2125] font-semibold text-xs px-3 py-1 rounded-[3px] flex items-center gap-1 transition-colors ml-1 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>

        {/* Right: Global search bar, notifications with orange "9+" badge, settings, user avatar */}
        <div className="flex items-center space-x-2">
          {/* Global Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#738496] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              className="bg-[#22272b] border border-[#282e33] text-xs w-72 md:w-80 text-[#b6c2cf] placeholder-[#738496] rounded-[3px] pl-8 pr-3 py-1 focus:outline-none focus:border-[#579dff] focus:ring-1 focus:ring-[#579dff] transition-all"
            />
          </div>

          {/* Notifications Bell with Orange Badge (9+) */}
          <button
            className="relative p-1.5 rounded-[3px] hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 bg-[#de350b] text-white text-[9px] font-bold rounded-full px-1 min-w-[15px] h-[14px] flex items-center justify-center leading-none border border-[#161a1d]">
              9+
            </span>
          </button>

          {/* Settings cog */}
          <button
            className="p-1.5 rounded-[3px] hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf] transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Help question circle */}
          <button
            className="p-1.5 rounded-[3px] hover:bg-[#22272b] text-[#8c9bab] hover:text-[#b6c2cf] transition-colors"
            title="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Avatar Circle: "FN" with deep orange background */}
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
          {/* Header: Spaces > Perspective x GPL */}
          <div className="p-3 border-b border-[#22272b] flex items-center justify-between">
            {!isSidebarCollapsed ? (
              <div className="flex items-center space-x-2.5 min-w-0">
                {/* Active Space Green Square Icon */}
                <div className="w-7 h-7 rounded-[3px] bg-[#216e4e] flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                  P
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-[#738496] tracking-wider leading-none mb-0.5">
                    Spaces
                  </div>
                  <h2 className="font-semibold text-xs text-[#c7d1db] truncate leading-tight">
                    Perspective x GPL
                  </h2>
                  <div className="text-[10px] text-[#738496] truncate">Software project</div>
                </div>
              </div>
            ) : (
              <div className="w-7 h-7 mx-auto rounded-[3px] bg-[#216e4e] flex items-center justify-center text-white font-bold text-xs">
                P
              </div>
            )}

            {/* Collapse toggle button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded-[3px] hover:bg-[#22272b] text-[#738496] hover:text-[#b6c2cf] transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>
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

            {/* Bottom Tools Section */}
            {!isSidebarCollapsed && (
              <div className="pt-3 mt-2 border-t border-[#22272b] space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#738496]">
                  Tools & Spaces
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

                <div className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-[3px] text-xs text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]/60 cursor-pointer">
                  <FileCode className="w-4 h-4 text-[#8c9bab]" />
                  <span>Confluence</span>
                </div>

                <div className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-[3px] text-xs text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]/60 cursor-pointer">
                  <Layers className="w-4 h-4 text-[#8c9bab]" />
                  <span>Assets</span>
                </div>

                <div className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-[3px] text-xs text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]/60 cursor-pointer">
                  <Users className="w-4 h-4 text-[#8c9bab]" />
                  <span>Teams</span>
                </div>

                <div className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded-[3px] text-xs text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b]/60 cursor-pointer">
                  <Target className="w-4 h-4 text-[#8c9bab]" />
                  <span>Goals</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Customize Sidebar Footer */}
          {!isSidebarCollapsed && (
            <div className="p-2 border-t border-[#22272b] text-[#738496] hover:text-[#b6c2cf] flex items-center space-x-2 cursor-pointer transition-colors px-3 py-2">
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Customize sidebar</span>
            </div>
          )}
        </aside>

        {/* 3. MAIN WORK AREA (bg #1d2125) */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#1d2125]">
          {children}
        </main>
      </div>
    </div>
  );
};
