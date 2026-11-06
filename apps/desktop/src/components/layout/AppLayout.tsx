import React from 'react';
import {
  CalendarRange,
  CheckSquare,
  FolderKanban,
  Calendar,
  FileText,
  MessageSquareCode,
  ShieldCheck,
  Cpu,
  Database,
} from 'lucide-react';

export type NavTab = 'tasks' | 'projects' | 'timeline' | 'calendar' | 'notes' | 'chat';

interface AppLayoutProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const navItems = [
    { id: 'timeline' as NavTab, label: 'Timeline / Gantt', icon: CalendarRange, badge: 'Jira' },
    { id: 'tasks' as NavTab, label: 'Tasks', icon: CheckSquare, badge: 'Core' },
    { id: 'projects' as NavTab, label: 'Projects', icon: FolderKanban },
    { id: 'calendar' as NavTab, label: 'Calendar Agenda', icon: Calendar },
    { id: 'notes' as NavTab, label: 'Notes (FTS5)', icon: FileText },
    { id: 'chat' as NavTab, label: 'AI Assistant', icon: MessageSquareCode, badge: 'NLP' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#101216] text-[#c1c7d0]">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-[#262933] bg-[#14161b] backdrop-blur-md">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#262933] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0052cc] to-[#579dff] flex items-center justify-center shadow-lg shadow-blue-500/20 font-bold text-sm text-white">
              M
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white flex items-center gap-1.5 text-sm">
                MAVEN
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-[#579dff]/15 text-[#579dff] border border-[#579dff]/30">
                  Jira Mode
                </span>
              </h1>
              <p className="text-[11px] text-[#8993a4]">Desktop AI Companion</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1c2027] text-[#579dff] font-semibold border-l-2 border-[#579dff] shadow-sm'
                    : 'text-[#8993a4] hover:text-[#c1c7d0] hover:bg-[#181b21]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#579dff]' : 'text-[#8993a4]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-[#579dff]/20 text-[#579dff]'
                        : 'bg-[#1e222b] text-[#5f687a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System & Runtime Health Indicator */}
        <div className="p-3.5 border-t border-[#262933] bg-[#14161b] text-xs text-[#8993a4] space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#8993a4]">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              SQLite Local
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">FTS5 Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#8993a4]">
              <Cpu className="w-3.5 h-3.5 text-[#579dff]" />
              NLP Engine
            </span>
            <span className="text-[10px] text-[#579dff] font-medium">&lt;2ms Rule Parser</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#262933]/80">
            <span className="flex items-center gap-1.5 text-[#5f687a]">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Local Privacy
            </span>
            <span className="text-[10px] text-[#5f687a]">Dark Charcoal</span>
          </div>
        </div>
      </aside>

      {/* Main Work Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#101216]">
        {children}
      </main>
    </div>
  );
};

