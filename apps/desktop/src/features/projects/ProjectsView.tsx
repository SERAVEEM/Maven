import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, ProjectStatus } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';

interface ProjectsViewProps {
  onProjectsChanged?: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onProjectsChanged }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#579dff');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('active');
  const [editColor, setEditColor] = useState('#579dff');
  const [isUpdating, setIsUpdating] = useState(false);

  // Safe Delete Modal State
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      onProjectsChanged?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditStatus(project.status);
    setEditColor(project.color || '#579dff');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim() || isUpdating) return;
    setIsUpdating(true);
    try {
      await ipc.updateProject({
        id: editingProject.id,
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        color: editColor,
      });
      setEditingProject(null);
      await loadData();
      onProjectsChanged?.();
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteModal = (project: Project) => {
    setDeletingProject(project);
  };

  const handleDelete = async () => {
    if (!deletingProject || isDeleting) return;
    setIsDeleting(true);
    try {
      await ipc.deleteProject(deletingProject.id);
      setDeletingProject(null);
      await loadData();
      onProjectsChanged?.();
    } finally {
      setIsDeleting(false);
    }
  };

  const deletingLinkedCount = deletingProject
    ? tasks.filter((t) => t.project_id === deletingProject.id).length
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full bg-transparent text-[#b6c2cf] font-sans">
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

      {/* Project Grid or Empty State */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#282e33] rounded-[4px] mt-6 bg-[#161a1d]/50">
          <FolderKanban className="w-10 h-10 text-[#738496] mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-[#c7d1db]">No projects yet</h3>
          <p className="text-xs text-[#8c9bab] max-w-sm mt-1">
            Create your first project above to group issues, track sprints, and monitor progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-5 overflow-y-auto flex-1 pr-1">
          {projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const completedTasks = projectTasks.filter((t) => t.status === 'done');
            const progress =
              projectTasks.length > 0
                ? Math.round((completedTasks.length / projectTasks.length) * 100)
                : 0;

            return (
              <div
                key={project.id}
                className="p-4 rounded-[4px] border border-[#282e33] bg-[#161a1d] hover:border-[#3b444c] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-[2px] flex-shrink-0"
                        style={{ backgroundColor: project.color || '#579dff' }}
                      />
                      <h3 className="font-semibold text-[#c7d1db] text-sm truncate" title={project.name}>
                        {project.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[2px] bg-[#22272b] text-[#8c9bab] border border-[#282e33]">
                        {project.status}
                      </span>
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-1 rounded-[3px] text-[#8c9bab] hover:text-[#579dff] hover:bg-[#22272b] transition-colors"
                        title="Edit project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(project)}
                        className="p-1 rounded-[3px] text-[#8c9bab] hover:text-[#ef4444] hover:bg-[#22272b] transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-xs text-[#8c9bab] mb-3 line-clamp-2">{project.description}</p>
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
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
          <div className="w-full max-w-md bg-[#161a1d] border border-[#282e33] rounded-[4px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#282e33] bg-[#181b1f]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#579dff]" />
                <h3 className="text-sm font-semibold text-[#c7d1db]">Edit Project</h3>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-[#8c9bab] hover:text-[#c7d1db] p-1 rounded-[3px] hover:bg-[#22272b] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8c9bab] uppercase mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="Project name..."
                    className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8c9bab] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    placeholder="Project description (optional)..."
                    className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8c9bab] uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                      className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] focus:outline-none focus:border-[#579dff]"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8c9bab] uppercase mb-1">
                      Color Theme
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-8 h-8 p-0.5 bg-[#22272b] border border-[#282e33] rounded-[3px] cursor-pointer"
                        title="Select project color"
                      />
                      <span className="text-xs font-mono text-[#8c9bab]">{editColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#282e33] bg-[#181b1f]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="bg-transparent hover:bg-[#22272b] text-[#8c9bab] hover:text-[#c7d1db] px-3 py-1.5 rounded-[3px] text-xs font-medium border border-[#282e33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim() || isUpdating}
                  className="bg-[#579dff] hover:bg-[#85b8ff] disabled:opacity-50 text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal (BR-004) */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
          <div className="w-full max-w-md bg-[#161a1d] border border-[#282e33] rounded-[4px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#282e33] bg-[#181b1f]">
              <div className="flex items-center gap-2 text-[#e34935]">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-[#c7d1db]">Delete Project</h3>
              </div>
              <button
                onClick={() => setDeletingProject(null)}
                className="text-[#8c9bab] hover:text-[#c7d1db] p-1 rounded-[3px] hover:bg-[#22272b] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-[#c7d1db]">
                Are you sure you want to delete project{' '}
                <span className="font-semibold text-white">"{deletingProject.name}"</span>?
              </p>

              <div className="p-3 rounded-[3px] bg-[#22272b] border border-[#282e33] text-xs space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-[#8c9bab]">Linked Issues:</span>
                  <span className="text-[#579dff] font-bold">{deletingLinkedCount}</span>
                </div>
                <p className="text-[11px] text-[#8c9bab] leading-relaxed">
                  <strong className="text-[#4bce97]">Safe Unlink Guarantee (BR-004):</strong> Linked
                  tasks will <span className="underline">not</span> be deleted. They will be
                  automatically unlinked and moved to your Personal Workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#282e33] bg-[#181b1f]">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="bg-transparent hover:bg-[#22272b] text-[#8c9bab] hover:text-[#c7d1db] px-3 py-1.5 rounded-[3px] text-xs font-medium border border-[#282e33] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-[#e34935] hover:bg-[#f87171] disabled:opacity-50 text-white px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete & Unlink Issues'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
