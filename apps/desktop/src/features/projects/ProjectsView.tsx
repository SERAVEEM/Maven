import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import { FolderKanban, Plus, CheckCircle2 } from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#579dff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const [p, t] = await Promise.all([ipc.getProjects(), ipc.getTasks(false)]);
    setProjects(p);
    setTasks(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ipc.createProject(name, description, color);
      setName('');
      setDescription('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full bg-[#1d2125] text-[#b6c2cf] font-sans">
      <div className="pb-4 border-b border-[#282e33]">
        <h2 className="text-xl font-bold tracking-tight text-[#c7d1db]">Projects & Spaces</h2>
        <p className="text-xs text-[#8c9bab] mt-0.5">
          Manage local project workspaces and sprints
        </p>
      </div>

      {/* Create Project Form */}
      <form
        onSubmit={handleCreate}
        className="mt-4 p-3.5 rounded-[4px] border border-[#282e33] bg-[#161a1d] flex flex-col gap-2.5"
      >
        <div className="flex gap-2.5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name..."
            className="flex-1 bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 p-0.5 bg-[#22272b] border border-[#282e33] rounded-[3px] cursor-pointer"
            title="Project color"
          />
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="bg-[#579dff] hover:bg-[#85b8ff] disabled:opacity-50 text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Project</span>
          </button>
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)..."
          className="bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1 text-xs text-[#8c9bab] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
        />
      </form>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-5 overflow-y-auto flex-1 pr-1">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.project_id === project.id || (project.name === 'Perspective x GPL' && t.task_key.startsWith('GPL-')));
          const completedTasks = projectTasks.filter((t) => t.status === 'done');
          const progress = projectTasks.length > 0
            ? Math.round((completedTasks.length / projectTasks.length) * 100)
            : 0;

          return (
            <div
              key={project.id}
              className="p-4 rounded-[4px] border border-[#282e33] bg-[#161a1d] hover:border-[#3b444c] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-[2px] flex-shrink-0"
                      style={{ backgroundColor: project.color || '#579dff' }}
                    />
                    <h3 className="font-semibold text-[#c7d1db] text-sm">{project.name}</h3>
                  </div>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[2px] bg-[#22272b] text-[#8c9bab] border border-[#282e33]">
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-[#8c9bab] mb-3">{project.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-[#282e33] text-xs text-[#8c9bab] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-[#579dff]" />
                  {projectTasks.length} Issues ({completedTasks.length} done)
                </span>
                <span className="flex items-center gap-1 text-[#4bce97] font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {progress}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
