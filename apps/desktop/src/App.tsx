import React, { useState } from 'react';
import { AppLayout, NavTab } from './components/layout/AppLayout';
import { TaskListView } from './features/tasks/TaskListView';
import { ProjectsView } from './features/projects/ProjectsView';
import { CalendarAgendaView } from './features/calendar/CalendarAgendaView';
import { NotesView } from './features/notes/NotesView';
import { ChatView } from './features/chat/ChatView';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('tasks');

  return (
    <AppLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'tasks' && <TaskListView />}
      {currentTab === 'projects' && <ProjectsView />}
      {currentTab === 'calendar' && <CalendarAgendaView />}
      {currentTab === 'notes' && <NotesView />}
      {currentTab === 'chat' && <ChatView />}
    </AppLayout>
  );
};

export default App;

