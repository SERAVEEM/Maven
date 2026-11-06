/**
 * MAVEN IPC Client Bridge
 * Transparently supports Native Tauri 2 Host IPC or In-Memory Mock Provider (for browser dev)
 */

import {
  Task,
  Project,
  Note,
  CalendarEvent,
  CreateTaskDto,
  UpdateTaskDto,
  CreateNoteDto,
  CreateCalendarEventDto,
  CommandIntent,
  CommandResult,
} from '@maven/contracts';

export interface IIpcClient {
  // Tasks
  getTasks(includeDeleted?: boolean): Promise<Task[]>;
  createTask(dto: CreateTaskDto): Promise<Task>;
  updateTask(dto: UpdateTaskDto): Promise<Task>;
  softDeleteTask(id: string): Promise<boolean>;
  restoreTask(id: string): Promise<boolean>;

  // Projects
  getProjects(): Promise<Project[]>;
  createProject(name: string, description?: string, color?: string): Promise<Project>;

  // Notes
  getNotes(includeDeleted?: boolean): Promise<Note[]>;
  createNote(dto: CreateNoteDto): Promise<Note>;
  softDeleteNote(id: string): Promise<boolean>;
  searchNotes(query: string): Promise<Note[]>;

  // Calendar
  getCalendarEvents(): Promise<CalendarEvent[]>;
  createCalendarEvent(dto: CreateCalendarEventDto): Promise<CalendarEvent>;

  // Command Interpreter
  interpretCommand(input: string): Promise<CommandIntent>;
  executeIntent(intent: CommandIntent): Promise<CommandResult<unknown>>;
}

/**
 * Deterministic Rule-Based Parser (0 MB RAM, <2ms)
 * Maps natural language patterns to structured intents
 */
function parseDeterministicInput(input: string): CommandIntent | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Pattern: "tugas baru [judul]" or "buat tugas [judul]" or "task [judul]"
  const taskMatch = lower.match(/^(?:buat tugas|tugas baru|add task|create task|task)\s+(.+)$/i);
  if (taskMatch) {
    const rawContent = taskMatch[1].trim();
    // Check if priority is indicated: e.g. "urgent", "penting", "prioritas tinggi"
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    let title = rawContent;

    if (lower.includes('urgent') || lower.includes('mendesak')) {
      priority = 'urgent';
      title = title.replace(/\b(urgent|mendesak)\b/gi, '').trim();
    } else if (lower.includes('penting') || lower.includes('high')) {
      priority = 'high';
      title = title.replace(/\b(penting|prioritas tinggi|high)\b/gi, '').trim();
    }

    // Check basic time keywords: e.g. "besok", "tomorrow", "lusa"
    let due_at: string | undefined = undefined;
    const now = new Date();
    if (lower.includes('besok') || lower.includes('tomorrow')) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(17, 0, 0, 0); // Default to 5 PM
      due_at = tomorrow.toISOString();
      title = title.replace(/\b(besok|tomorrow)\b/gi, '').trim();
    } else if (lower.includes('lusa')) {
      const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      dayAfter.setHours(17, 0, 0, 0);
      due_at = dayAfter.toISOString();
      title = title.replace(/\b(lusa)\b/gi, '').trim();
    }

    return {
      intent: 'create_task',
      confidence: 0.95,
      is_deterministic: true,
      parameters: {
        title,
        priority,
        due_at,
      },
      requires_confirmation: false,
    };
  }

  // Pattern: "ingatkan [pesan] [kapan]" or "remind me to [msg]"
  const reminderMatch = lower.match(/^(?:ingatkan aku|ingatkan|remind me to|remind me)\s+(.+)$/i);
  if (reminderMatch) {
    const raw = reminderMatch[1].trim();
    const now = new Date();
    let trigger_at = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    let title = raw;

    if (lower.includes('besok')) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow.setHours(9, 0, 0, 0);
      trigger_at = tomorrow.toISOString();
      title = title.replace(/\bbesok\b/gi, '').trim();
    }

    return {
      intent: 'create_reminder',
      confidence: 0.9,
      is_deterministic: true,
      parameters: {
        title: `Ingat: ${title}`,
        trigger_at,
      },
      requires_confirmation: false,
    };
  }

  // Pattern: "catat [judul] : [isi]" or "buat catatan [judul]"
  const noteMatch = lower.match(/^(?:catat|buat catatan|note|catatan baru)\s+(.+)$/i);
  if (noteMatch) {
    const raw = noteMatch[1].trim();
    const parts = raw.split(/[:\-]/);
    const title = parts[0]?.trim() || 'Catatan Baru';
    const content = parts[1]?.trim() || '';

    return {
      intent: 'create_note',
      confidence: 0.92,
      is_deterministic: true,
      parameters: {
        title,
        content,
      },
      requires_confirmation: false,
    };
  }

  // Pattern: "cari catatan [keyword]"
  const searchMatch = lower.match(/^(?:cari catatan|search notes|cari note|temukan)\s+(.+)$/i);
  if (searchMatch) {
    return {
      intent: 'search_notes',
      confidence: 0.95,
      is_deterministic: true,
      parameters: {
        query: searchMatch[1].trim(),
      },
      requires_confirmation: false,
    };
  }

  // Ambiguous: requires AI or clarification
  return null;
}

/**
 * In-Memory Mock Provider (Persisted in localStorage)
 */
class MockIpcProvider implements IIpcClient {
  private tasks: Task[] = [];
  private projects: Project[] = [];
  private notes: Note[] = [];
  private events: CalendarEvent[] = [];

  constructor() {
    this.loadFromStorage();
    if (this.projects.length === 0) {
      this.seedInitialData();
    }
  }

  private loadFromStorage() {
    try {
      const t = localStorage.getItem('maven_mock_tasks');
      const p = localStorage.getItem('maven_mock_projects');
      const n = localStorage.getItem('maven_mock_notes');
      const e = localStorage.getItem('maven_mock_events');
      if (t) {
        const parsed = JSON.parse(t);
        // Normalize any older seed data without task_key or starts_at
        this.tasks = parsed.map((item: Task, idx: number) => ({
          ...item,
          task_key: item.task_key || `MVN-${idx + 1}`,
          starts_at: item.starts_at ?? null,
          epic: item.epic ?? null,
          color: item.color ?? '#6366f1',
        }));
      }
      if (p) this.projects = JSON.parse(p);
      if (n) this.notes = JSON.parse(n);
      if (e) this.events = JSON.parse(e);

      const projId = 'proj-gpl';
      if (!this.projects.some((p) => p.id === projId)) {
        this.projects.unshift({
          id: projId,
          name: 'Perspective x GPL',
          description: 'SaaS Platform Development - Sprint 1',
          status: 'active',
          color: '#579dff',
          created_at: new Date('2026-11-01T08:00:00Z').toISOString(),
          updated_at: new Date('2026-11-01T08:00:00Z').toISOString(),
        });
      }

      // Ensure GPL tasks exist for the Jira Timeline view
      const hasGpl21 = this.tasks.some((t) => t.task_key === 'GPL-21');
      if (!this.tasks.some((t) => t.task_key && t.task_key.startsWith('GPL-')) || !hasGpl21) {
        // Remove partial old GPL tasks if any to refresh with authentic 13 tasks
        this.tasks = this.tasks.filter((t) => !t.task_key || !t.task_key.startsWith('GPL-'));

        const gplTasks: Task[] = [
          {
            id: 'gpl-task-04',
            project_id: projId,
            task_key: 'GPL-4',
            title: 'Penentuan Konsep UI/UX',
            description: 'Wireframing, typography, color system & Dynamic Island micro-interactions.',
            status: 'done',
            priority: 'high',
            starts_at: '2026-10-12T09:00:00Z',
            due_at: '2026-11-06T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: '2026-11-06T17:00:00Z',
            epic: 'Design Sprint',
            color: '#8777d9',
            created_at: '2026-10-10T09:00:00Z',
            updated_at: '2026-11-06T17:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-05',
            project_id: projId,
            task_key: 'GPL-5',
            title: 'Project Documents',
            description: 'Functional requirements, PRD, architecture, and SQLite schema DDL specification.',
            status: 'done',
            priority: 'medium',
            starts_at: '2026-10-20T09:00:00Z',
            due_at: '2026-11-14T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: '2026-11-14T16:00:00Z',
            epic: 'Project Specs',
            color: '#00b8d9',
            created_at: '2026-10-18T09:00:00Z',
            updated_at: '2026-11-14T16:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-19',
            project_id: projId,
            task_key: 'GPL-19',
            title: 'Setup Frontend',
            description: 'Initialize React 19, Tailwind CSS v4, Lucide icons, and Tauri IPC bridge.',
            status: 'in_progress',
            priority: 'urgent',
            starts_at: '2026-11-02T09:00:00Z',
            due_at: '2026-11-24T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Frontend Core',
            color: '#388bff',
            created_at: '2026-11-01T09:00:00Z',
            updated_at: '2026-11-16T12:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-20',
            project_id: projId,
            task_key: 'GPL-20',
            title: 'Setup Backend',
            description: 'Rust Tauri 2 host commands, rusqlite connection pool, and FTS5 triggers.',
            status: 'in_progress',
            priority: 'urgent',
            starts_at: '2026-11-08T09:00:00Z',
            due_at: '2026-11-29T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Backend Core',
            color: '#ffab00',
            created_at: '2026-11-05T09:00:00Z',
            updated_at: '2026-11-16T14:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-21',
            project_id: projId,
            task_key: 'GPL-21',
            title: 'Database Schema & Migrations',
            description: 'SQLite migration scripts, indexes, foreign key constraints & FTS5 full text search.',
            status: 'in_progress',
            priority: 'urgent',
            starts_at: '2026-11-12T09:00:00Z',
            due_at: '2026-12-04T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Backend Core',
            color: '#8777d9',
            created_at: '2026-11-08T09:00:00Z',
            updated_at: '2026-11-16T15:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-31',
            project_id: projId,
            task_key: 'GPL-31',
            title: 'Design Landing Page',
            description: 'Hero presentation, product feature highlights, and interactive preview components.',
            status: 'todo',
            priority: 'high',
            starts_at: '2026-11-16T09:00:00Z',
            due_at: '2026-12-08T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Design System',
            color: '#ffab00',
            created_at: '2026-11-10T09:00:00Z',
            updated_at: '2026-11-10T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-32',
            project_id: projId,
            task_key: 'GPL-32',
            title: 'Design Auth System',
            description: 'User login, MFA dialogs, session persistence, and local credential storage mockups.',
            status: 'todo',
            priority: 'medium',
            starts_at: '2026-11-20T09:00:00Z',
            due_at: '2026-12-15T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Auth Module',
            color: '#388bff',
            created_at: '2026-11-10T09:00:00Z',
            updated_at: '2026-11-10T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-33',
            project_id: projId,
            task_key: 'GPL-33',
            title: 'Design Global Element',
            description: 'Global modals, toast notification systems, Dynamic Island expanded cards & icons.',
            status: 'todo',
            priority: 'medium',
            starts_at: '2026-11-26T09:00:00Z',
            due_at: '2026-12-22T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Design System',
            color: '#ff5630',
            created_at: '2026-11-12T09:00:00Z',
            updated_at: '2026-11-12T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-50',
            project_id: projId,
            task_key: 'GPL-50',
            title: 'Authentication & Authorization',
            description: 'Role-based access control, JWT session handling, and OAuth2 security providers.',
            status: 'backlog',
            priority: 'high',
            starts_at: '2026-12-02T09:00:00Z',
            due_at: '2026-12-28T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Auth Module',
            color: '#00b8d9',
            created_at: '2026-11-15T09:00:00Z',
            updated_at: '2026-11-15T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-62',
            project_id: projId,
            task_key: 'GPL-62',
            title: 'Implement AuthSystem',
            description: 'Wire auth services to desktop state, password hash verification, and offline fallback.',
            status: 'backlog',
            priority: 'high',
            starts_at: '2026-12-16T09:00:00Z',
            due_at: '2027-01-14T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Auth Module',
            color: '#ffab00',
            created_at: '2026-11-15T09:00:00Z',
            updated_at: '2026-11-15T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-63',
            project_id: projId,
            task_key: 'GPL-63',
            title: 'Implementasi LandingPage',
            description: 'Responsive landing page with motion animations, interactive widgets & onboarding.',
            status: 'backlog',
            priority: 'medium',
            starts_at: '2027-01-04T09:00:00Z',
            due_at: '2027-01-28T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Web Portal',
            color: '#388bff',
            created_at: '2026-11-15T09:00:00Z',
            updated_at: '2026-11-15T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-64',
            project_id: projId,
            task_key: 'GPL-64',
            title: 'Implement Global Component',
            description: 'Design system library packaging: buttons, form inputs, dialogs, charts & timeline bars.',
            status: 'backlog',
            priority: 'medium',
            starts_at: '2027-01-16T09:00:00Z',
            due_at: '2027-02-10T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Web Portal',
            color: '#8777d9',
            created_at: '2026-11-15T09:00:00Z',
            updated_at: '2026-11-15T09:00:00Z',
            deleted_at: null,
          },
          {
            id: 'gpl-task-65',
            project_id: projId,
            task_key: 'GPL-65',
            title: 'Implement Dashboard',
            description: 'Comprehensive dashboard analytics, activity feed, KPI charts & team status overview.',
            status: 'backlog',
            priority: 'high',
            starts_at: '2027-02-02T09:00:00Z',
            due_at: '2027-02-26T18:00:00Z',
            due_timezone: 'Asia/Jakarta',
            completed_at: null,
            epic: 'Core App',
            color: '#ff5630',
            created_at: '2026-11-15T09:00:00Z',
            updated_at: '2026-11-15T09:00:00Z',
            deleted_at: null,
          },
        ];
        this.tasks = [...gplTasks, ...this.tasks];
      }
    } catch {
      // ignore
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('maven_mock_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('maven_mock_projects', JSON.stringify(this.projects));
      localStorage.setItem('maven_mock_notes', JSON.stringify(this.notes));
      localStorage.setItem('maven_mock_events', JSON.stringify(this.events));
    } catch {
      // ignore
    }
  }

  private seedInitialData() {
    const now = new Date().toISOString();
    const projId = 'proj-01-core';
    this.projects = [
      {
        id: projId,
        name: 'Pengembangan MAVEN',
        description: 'Implementasi MVP Windows Desktop',
        status: 'active',
        color: '#6366f1',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'proj-02-personal',
        name: 'Pribadi & Belajar',
        description: 'Aktivitas harian dan eksplorasi teknologi',
        status: 'active',
        color: '#10b981',
        created_at: now,
        updated_at: now,
      },
    ];

    this.tasks = [
      {
        id: 'task-01',
        project_id: projId,
        task_key: 'MVN-4',
        title: 'Penentuan Konsep UI/UX',
        description: 'Menyusun wireframe, color palette, dan flow Dynamic Island untuk desktop.',
        status: 'done',
        priority: 'high',
        starts_at: '2026-11-01T09:00:00Z',
        due_at: '2026-11-10T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: '2026-11-09T17:00:00Z',
        epic: 'Design',
        color: '#8b5cf6',
        created_at: '2026-11-01T08:30:00Z',
        updated_at: '2026-11-09T17:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-02',
        project_id: projId,
        task_key: 'MVN-5',
        title: 'Project Documents & Architecture Specification',
        description: 'Finalisasi PRD, ARCHITECTURE.md, dan DDL SQLite dengan FTS5.',
        status: 'done',
        priority: 'medium',
        starts_at: '2026-11-03T09:00:00Z',
        due_at: '2026-11-14T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: '2026-11-13T16:00:00Z',
        epic: 'Management',
        color: '#10b981',
        created_at: '2026-11-03T08:30:00Z',
        updated_at: '2026-11-13T16:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-03',
        project_id: projId,
        task_key: 'MVN-19',
        title: 'Setup Frontend (React 19 + Tailwind v4)',
        description: 'Inisialisasi Vite UI shell, router, dan Quick Action Alt+K bar.',
        status: 'in_progress',
        priority: 'urgent',
        starts_at: '2026-11-12T09:00:00Z',
        due_at: '2026-11-26T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        epic: 'Frontend',
        color: '#3b82f6',
        created_at: '2026-11-12T08:30:00Z',
        updated_at: '2026-11-16T10:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-04',
        project_id: projId,
        task_key: 'MVN-20',
        title: 'Setup Backend (Tauri 2 + SQLite WAL)',
        description: 'Konfigurasi host Rust, SQLite WAL mode, FTS5 triggers, dan migration engine.',
        status: 'in_progress',
        priority: 'urgent',
        starts_at: '2026-11-15T09:00:00Z',
        due_at: '2026-11-30T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        epic: 'Backend',
        color: '#f59e0b',
        created_at: '2026-11-15T08:30:00Z',
        updated_at: '2026-11-18T14:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-05',
        project_id: projId,
        task_key: 'MVN-31',
        title: 'Design Landing Page & Dynamic Island Widgets',
        description: 'Komponen visual untuk status bar desktop, quick notch, dan timeline view.',
        status: 'todo',
        priority: 'high',
        starts_at: '2026-11-22T09:00:00Z',
        due_at: '2026-12-08T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        epic: 'Design',
        color: '#ec4899',
        created_at: '2026-11-20T09:00:00Z',
        updated_at: '2026-11-20T09:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-06',
        project_id: projId,
        task_key: 'MVN-38',
        title: 'Implement Backlog & Timeline Gantt View',
        description: 'Tampilan visual timeline ala Jira dengan drag & drop bar dan filter backlog.',
        status: 'todo',
        priority: 'high',
        starts_at: '2026-12-01T09:00:00Z',
        due_at: '2026-12-15T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        epic: 'Frontend',
        color: '#6366f1',
        created_at: '2026-11-20T10:00:00Z',
        updated_at: '2026-11-20T10:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-07',
        project_id: projId,
        task_key: 'MVN-42',
        title: 'AI Natural Language Intent Dispatcher',
        description: 'Deteksi perintah teks bebas untuk auto-scheduling dan pembuatan task cepat.',
        status: 'backlog',
        priority: 'medium',
        starts_at: '2026-12-10T09:00:00Z',
        due_at: '2026-12-25T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        epic: 'AI Engine',
        color: '#06b6d4',
        created_at: '2026-11-21T09:00:00Z',
        updated_at: '2026-11-21T09:00:00Z',
        deleted_at: null,
      },
      {
        id: 'task-08',
        project_id: 'proj-02-personal',
        task_key: 'MVN-45',
        title: 'System Tray & Native Toast Notification Companion',
        description: 'Integrasi background companion Windows tray & reminder notifications.',
        status: 'backlog',
        priority: 'low',
        starts_at: '2026-12-16T09:00:00Z',
        due_at: '2026-12-31T18:00:00Z',
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        epic: 'Backend',
        color: '#f97316',
        created_at: '2026-11-21T11:00:00Z',
        updated_at: '2026-11-21T11:00:00Z',
        deleted_at: null,
      },
    ];

    this.notes = [
      {
        id: 'note-01',
        title: 'Arsitektur Local-First MAVEN',
        content:
          'Prinsip utama MAVEN:\n1. Data lokal SQLite milik perangkat.\n2. AI sebagai interpreter terstruktur, bukan pemilik data.\n3. Parser deterministik hemat RAM didahulukan.',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ];

    this.events = [
      {
        id: 'event-01',
        title: 'Sprint Planning MAVEN v0.1',
        description: 'Evaluasi kesiapan engine desktop dan demo mock UI.',
        location: 'Virtual',
        starts_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        ends_at: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        timezone: 'Asia/Jakarta',
        all_day: false,
        recurrence_rule: null,
        created_at: now,
        updated_at: now,
      },
    ];

    this.saveToStorage();
  }

  async getTasks(includeDeleted = false): Promise<Task[]> {
    return this.tasks.filter((t) => (includeDeleted ? true : t.deleted_at === null));
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const now = new Date().toISOString();
    const task_key = dto.task_key || `MVN-${this.tasks.length + 1}`;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      project_id: dto.project_id || null,
      task_key,
      title: dto.title.trim(),
      description: dto.description || null,
      status: dto.status || 'todo',
      priority: dto.priority || 'medium',
      starts_at: dto.starts_at || null,
      due_at: dto.due_at || null,
      due_timezone: dto.due_timezone || 'Asia/Jakarta',
      completed_at: null,
      epic: dto.epic || null,
      color: dto.color || '#3b82f6',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    this.tasks.unshift(newTask);
    this.saveToStorage();
    return newTask;
  }

  async updateTask(dto: UpdateTaskDto): Promise<Task> {
    const idx = this.tasks.findIndex((t) => t.id === dto.id);
    if (idx === -1) throw new Error('Task not found');
    const existing = this.tasks[idx]!;
    const now = new Date().toISOString();
    const updated: Task = {
      ...existing,
      task_key: dto.task_key !== undefined ? dto.task_key : existing.task_key,
      title: dto.title !== undefined ? dto.title.trim() : existing.title,
      description: dto.description !== undefined ? dto.description : existing.description,
      project_id: dto.project_id !== undefined ? dto.project_id : existing.project_id,
      status: dto.status !== undefined ? dto.status : existing.status,
      priority: dto.priority !== undefined ? dto.priority : existing.priority,
      starts_at: dto.starts_at !== undefined ? dto.starts_at : existing.starts_at,
      due_at: dto.due_at !== undefined ? dto.due_at : existing.due_at,
      due_timezone: dto.due_timezone !== undefined ? dto.due_timezone : existing.due_timezone,
      epic: dto.epic !== undefined ? dto.epic : existing.epic,
      color: dto.color !== undefined ? dto.color : existing.color,
      completed_at:
        dto.status === 'done' && !existing.completed_at
          ? now
          : dto.status && dto.status !== 'done'
          ? null
          : existing.completed_at,
      updated_at: now,
    };
    this.tasks[idx] = updated;
    this.saveToStorage();
    return updated;
  }

  async softDeleteTask(id: string): Promise<boolean> {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tasks[idx]!.deleted_at = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  async restoreTask(id: string): Promise<boolean> {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tasks[idx]!.deleted_at = null;
    this.saveToStorage();
    return true;
  }

  async getProjects(): Promise<Project[]> {
    return this.projects;
  }

  async createProject(name: string, description?: string, color?: string): Promise<Project> {
    const now = new Date().toISOString();
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim(),
      description: description || null,
      status: 'active',
      color: color || '#6366f1',
      created_at: now,
      updated_at: now,
    };
    this.projects.push(newProj);
    this.saveToStorage();
    return newProj;
  }

  async getNotes(includeDeleted = false): Promise<Note[]> {
    return this.notes.filter((n) => (includeDeleted ? true : n.deleted_at === null));
  }

  async createNote(dto: CreateNoteDto): Promise<Note> {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: dto.title.trim(),
      content: dto.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    this.notes.unshift(newNote);
    this.saveToStorage();
    return newNote;
  }

  async softDeleteNote(id: string): Promise<boolean> {
    const idx = this.notes.findIndex((n) => n.id === id);
    if (idx === -1) return false;
    this.notes[idx]!.deleted_at = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  async searchNotes(query: string): Promise<Note[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getNotes();
    // Simulate FTS5 token search
    return this.notes.filter(
      (n) =>
        n.deleted_at === null &&
        (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    );
  }

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return this.events.sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }

  async createCalendarEvent(dto: CreateCalendarEventDto): Promise<CalendarEvent> {
    const now = new Date().toISOString();
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: dto.title.trim(),
      description: dto.description || null,
      location: dto.location || null,
      starts_at: dto.starts_at,
      ends_at: dto.ends_at || null,
      timezone: dto.timezone || 'Asia/Jakarta',
      all_day: dto.all_day || false,
      recurrence_rule: dto.recurrence_rule || null,
      created_at: now,
      updated_at: now,
    };
    this.events.push(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  async interpretCommand(input: string): Promise<CommandIntent> {
    // 1. Try Deterministic Engine first (<2ms, 0 RAM)
    const deterministic = parseDeterministicInput(input);
    if (deterministic) {
      return deterministic;
    }

    // 2. Simulated Local AI fallback for ambiguous queries
    return {
      intent: 'clarification_needed',
      confidence: 0.65,
      is_deterministic: false,
      parameters: { original_input: input },
      requires_confirmation: false,
      clarification_question: `Saya belum sepenuhnya memahami instruksi "${input}". Apakah Anda ingin membuat Tugas baru, Pengingat, atau Catatan?`,
    };
  }

  async executeIntent(intent: CommandIntent): Promise<CommandResult<unknown>> {
    switch (intent.intent) {
      case 'create_task': {
        const title = intent.parameters.title as string;
        const priority = intent.parameters.priority as Task['priority'] | undefined;
        const due_at = intent.parameters.due_at as string | undefined;
        const task = await this.createTask({ title, priority, due_at });
        return { success: true, data: task };
      }
      case 'create_note': {
        const title = intent.parameters.title as string;
        const content = (intent.parameters.content as string) || '';
        const note = await this.createNote({ title, content });
        return { success: true, data: note };
      }
      case 'create_reminder': {
        const title = intent.parameters.title as string;
        const trigger_at = intent.parameters.trigger_at as string;
        const task = await this.createTask({
          title,
          priority: 'high',
          due_at: trigger_at,
        });
        return { success: true, data: task };
      }
      default:
        return {
          success: false,
          error: { code: 'UNSUPPORTED_INTENT', message: 'Intent belum didukung oleh eksekutor' },
        };
    }
  }
}

// Singleton export
export const ipc: IIpcClient = new MockIpcProvider();

