import React from 'react';
import {
  CheckSquare,
  FolderKanban,
  Calendar,
  FileText,
  MessageSquareCode,
  ShieldCheck,
  Cpu,
  Database,
} from 'lucide-react';

export type NavTab = 'tasks' | 'projects' | 'calendar' | 'notes' | 'chat';

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
    { id: 'tasks' as NavTab, label: 'Tasks', icon: CheckSquare, badge: 'Core' },
    { id: 'projects' as NavTab, label: 'Projects', icon: FolderKanban },
    { id: 'calendar' as NavTab, label: 'Calendar Agenda', icon: Calendar },
    { id: 'notes' as NavTab, label: 'Notes (FTS5)', icon: FileText },
    { id: 'chat' as NavTab, label: 'AI Assistant', icon: MessageSquareCode, badge: 'NLP' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/60 backdrop-blur-md">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-lg text-white">
              M
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-white flex items-center gap-1.5">
                MAVEN
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v0.1
                </span>
              </h1>
              <p className="text-xs text-slate-400">Personal AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-700/80 text-indigo-100'
                        : 'bg-slate-800 text-slate-400'
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              SQLite Local
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">FTS5 Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              NLP Engine
            </span>
            <span className="text-[11px] text-indigo-400 font-medium">&lt;2ms Rule Parser</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Offline Privacy
            </span>
            <span className="text-[10px] text-slate-500">Single-Device</span>
          </div>
        </div>
      </aside>

      {/* Main Work Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {children}
      </main>
    </div>
  );
};

