import React, { useState, useEffect } from 'react';
import { AppLayout, NavTab } from './components/layout/AppLayout';
import { TimelineView } from './features/timeline/TimelineView';
import { TaskListView } from './features/tasks/TaskListView';
import { ProjectsView } from './features/projects/ProjectsView';
import { CalendarAgendaView } from './features/calendar/CalendarAgendaView';
import { NotesView } from './features/notes/NotesView';
import { ChatView } from './features/chat/ChatView';
import { DynamicIsland } from './components/DynamicIsland';
import { QuickActionModal } from './components/QuickActionModal';

export const App: React.FC = () => {
  // Default to Jira Dark Mode Timeline view as requested
  const [currentTab, setCurrentTab] = useState<NavTab>('timeline');
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global keyboard shortcuts: Alt+K (Command Palette), Alt+V (Voice Push-to-Talk), Esc (Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+K or Ctrl+K: Quick Action Command Palette
      if ((e.altKey && e.code === 'KeyK') || (e.ctrlKey && e.code === 'KeyK')) {
        e.preventDefault();
        setIsQuickActionOpen((prev) => !prev);
        setIsVoiceActive(false);
      }

      // Alt+V: Voice Push-to-Talk listening mode
      if ((e.altKey && e.code === 'KeyV') || (e.ctrlKey && e.shiftKey && e.code === 'KeyV')) {
        e.preventDefault();
        setIsQuickActionOpen(true);
        setIsVoiceActive(true);
      }

      // Esc: Close Command Palette
      if (e.key === 'Escape' && isQuickActionOpen) {
        setIsQuickActionOpen(false);
        setIsVoiceActive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickActionOpen]);

  const handleActionSuccess = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTriggerVoice = () => {
    setIsQuickActionOpen(true);
    setIsVoiceActive(true);
  };

  return (
    <>
      {/* MAVEN Dynamic Island (Poni Desktop) with Voice Push-to-Talk */}
      <DynamicIsland
        onOpenQuickAdd={() => {
          setIsQuickActionOpen(true);
          setIsVoiceActive(false);
        }}
        onMaximizeApp={() => setCurrentTab('timeline')}
        onTriggerVoice={handleTriggerVoice}
      />

      {/* Quick Action / Command Palette Modal with Voice Support (Alt+K / Alt+V) */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => {
          setIsQuickActionOpen(false);
          setIsVoiceActive(false);
        }}
        onSuccess={handleActionSuccess}
        isVoiceActive={isVoiceActive}
        onVoiceActiveChange={setIsVoiceActive}
      />

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1d212a] border border-[#262933] text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="text-[#579dff]">✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Full-App Dashboard */}
      <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
        {currentTab === 'timeline' && <TimelineView />}
        {currentTab === 'tasks' && <TaskListView />}
        {currentTab === 'projects' && <ProjectsView />}
        {currentTab === 'calendar' && <CalendarAgendaView />}
        {currentTab === 'notes' && <NotesView />}
        {currentTab === 'chat' && <ChatView />}
      </AppLayout>
    </>
  );
};

export default App;
