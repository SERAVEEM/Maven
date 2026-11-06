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
      if (t) this.tasks = JSON.parse(t);
      if (p) this.projects = JSON.parse(p);
      if (n) this.notes = JSON.parse(n);
      if (e) this.events = JSON.parse(e);
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

    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    this.tasks = [
      {
        id: 'task-01',
        project_id: projId,
        title: 'Review spesifikasi teknis dan DDL SQLite',
        description: 'Pastikan FTS5, triggers, dan soft delete sudah selaras dengan PRD.',
        status: 'done',
        priority: 'high',
        due_at: now,
        due_timezone: 'Asia/Jakarta',
        completed_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'task-02',
        project_id: projId,
        title: 'Setup Monorepo & UI Shell React + Tailwind',
        description: 'Bangun dashboard desktop dengan layout responsif dan navigasi rapi.',
        status: 'in_progress',
        priority: 'urgent',
        due_at: tomorrow,
        due_timezone: 'Asia/Jakarta',
        completed_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: 'task-03',
        project_id: 'proj-02-personal',
        title: 'Beli kopi biji roasted beans',
        description: 'Untuk stok mingguan.',
        status: 'todo',
        priority: 'low',
        due_at: null,
        due_timezone: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
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
    const newTask: Task = {
      id: `task-${Date.now()}`,
      project_id: dto.project_id || null,
      title: dto.title.trim(),
      description: dto.description || null,
      status: 'todo',
      priority: dto.priority || 'medium',
      due_at: dto.due_at || null,
      due_timezone: dto.due_timezone || 'Asia/Jakarta',
      completed_at: null,
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
      title: dto.title !== undefined ? dto.title.trim() : existing.title,
      description: dto.description !== undefined ? dto.description : existing.description,
      project_id: dto.project_id !== undefined ? dto.project_id : existing.project_id,
      status: dto.status !== undefined ? dto.status : existing.status,
      priority: dto.priority !== undefined ? dto.priority : existing.priority,
      due_at: dto.due_at !== undefined ? dto.due_at : existing.due_at,
      due_timezone: dto.due_timezone !== undefined ? dto.due_timezone : existing.due_timezone,
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

