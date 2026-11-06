import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import { FolderKanban, Plus, CheckCircle2 } from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-bold tracking-tight text-white">Projects</h2>
        <p className="text-sm text-slate-400">
          Kelompokkan tugas dan aktivitas pribadi ke dalam ruang lingkup proyek
        </p>
      </div>

      {/* Create Project Form */}
      <form onSubmit={handleCreate} className="mt-5 p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col gap-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama proyek baru..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 p-1 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
            title="Warna Proyek"
          />
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Proyek</span>
          </button>
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi singkat proyek (opsional)..."
          className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </form>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 overflow-y-auto flex-1 pr-1">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.project_id === project.id);
          const completedTasks = projectTasks.filter((t) => t.status === 'done');
          const progress = projectTasks.length > 0
            ? Math.round((completedTasks.length / projectTasks.length) * 100)
            : 0;

          return (
            <div
              key={project.id}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    />
                    <h3 className="font-semibold text-white text-base">{project.name}</h3>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {project.status}
                  </span>
                </div>
                {project.description && (
                  <p className="text-xs text-slate-400 mb-4">{project.description}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                  {projectTasks.length} Tugas ({completedTasks.length} selesai)
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
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

