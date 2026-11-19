import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarEvent } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Globe,
} from 'lucide-react';

import { toLocalDatetimeInput } from '../../lib/ui-helpers';

interface EventModalState {
  mode: 'create' | 'edit';
  event?: CalendarEvent;
}

export const CalendarAgendaView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalState, setModalState] = useState<EventModalState | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [eventTimezone, setEventTimezone] = useState('');

  // Auto-detect local IANA timezone
  const detectedTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }, []);

  const loadData = useCallback(async () => {
    try {
      const list = await ipc.getCalendarEvents();
      setEvents(list);
    } catch (err) {
      console.error('Failed to load calendar events', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // BR-002 Validation
  const validationError = useMemo(() => {
    if (!title.trim()) return 'Event title is required';
    if (!startsAt) return 'Start time is required';
    if (endsAt) {
      const startMs = new Date(startsAt).getTime();
      const endMs = new Date(endsAt).getTime();
      if (isNaN(startMs) || isNaN(endMs)) return 'Invalid date or time format';
      if (endMs <= startMs) {
        return 'End time must be strictly after start time (BR-002)';
      }
    }
    return null;
  }, [title, startsAt, endsAt]);

  const openCreateModal = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const startStr = toLocalDatetimeInput(now.toISOString());
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    const endStr = toLocalDatetimeInput(later.toISOString());

    setTitle('');
    setDescription('');
    setLocation('');
    setStartsAt(startStr);
    setEndsAt(endStr);
    setAllDay(false);
    setEventTimezone(detectedTimezone);
    setErrorMessage(null);
    setModalState({ mode: 'create' });
  };

  const openEditModal = (evt: CalendarEvent) => {
    setTitle(evt.title);
    setDescription(evt.description || '');
    setLocation(evt.location || '');
    setStartsAt(toLocalDatetimeInput(evt.starts_at));
    setEndsAt(toLocalDatetimeInput(evt.ends_at));
    setAllDay(evt.all_day);
    setEventTimezone(evt.timezone || detectedTimezone);
    setErrorMessage(null);
    setModalState({ mode: 'edit', event: evt });
  };

  const closeModal = () => {
    setModalState(null);
    setErrorMessage(null);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const startsIso = new Date(startsAt).toISOString();
      const endsIso = endsAt ? new Date(endsAt).toISOString() : null;

      if (modalState?.mode === 'create') {
        await ipc.createCalendarEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          starts_at: startsIso,
          ends_at: endsIso || undefined,
          timezone: eventTimezone || detectedTimezone,
          all_day: allDay,
        });
      } else if (modalState?.mode === 'edit' && modalState.event) {
        await ipc.updateCalendarEvent({
          id: modalState.event.id,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          starts_at: startsIso,
          ends_at: endsIso,
          timezone: eventTimezone || detectedTimezone,
          all_day: allDay,
        });
      }

      await loadData();
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ipc.deleteCalendarEvent(eventToDelete.id);
      setEventToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete event', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full bg-transparent text-[#b6c2cf] font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-[#282e33] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#c7d1db]">Calendar Agenda</h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#22272b] border border-[#282e33] text-[11px] text-[#8c9bab]">
              <Globe className="w-3 h-3 text-[#579dff]" />
              <span>{detectedTimezone}</span>
            </div>
          </div>
          <p className="text-xs text-[#8c9bab] mt-1">
            Chronological schedule and sprint milestone calendar with timezone safety (BR-002)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Event</span>
        </button>
      </div>

      {/* Events Timeline */}
      <div className="mt-5 flex-1 overflow-y-auto space-y-2.5 pr-1">
        {events.length === 0 ? (
          <div className="text-center py-20 text-[#738496] text-xs border border-dashed border-[#282e33] rounded-[4px] bg-[#161a1d]/50">
            <CalendarIcon className="w-8 h-8 text-[#579dff]/40 mx-auto mb-2" />
            <p className="font-medium text-[#8c9bab]">No events scheduled yet</p>
            <p className="text-[11px] text-[#738496] mt-0.5">Click &quot;Schedule Event&quot; to add your first milestone.</p>
          </div>
        ) : (
          events.map((evt) => {
            const startDate = new Date(evt.starts_at);
            const endDate = evt.ends_at ? new Date(evt.ends_at) : null;

            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-[4px] border border-[#282e33] bg-[#161a1d] hover:border-[#3b444c] transition-colors flex items-start justify-between group"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-11 h-11 rounded-[3px] bg-[#22272b] border border-[#282e33] flex flex-col items-center justify-center text-[#579dff] flex-shrink-0">
                    <span className="text-[9px] uppercase font-bold text-[#8c9bab]">
                      {startDate.toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-sm font-bold leading-none text-[#c7d1db]">
                      {startDate.getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#c7d1db] text-xs">{evt.title}</h3>
                      {evt.all_day && (
                        <span className="px-1.5 py-0.2 bg-[#579dff]/15 text-[#579dff] text-[10px] rounded-[2px] font-medium">
                          All Day
                        </span>
                      )}
                    </div>
                    {evt.description && (
                      <p className="text-[11px] text-[#8c9bab] mt-0.5 leading-relaxed">{evt.description}</p>
                    )}
                    <div className="flex items-center gap-3.5 mt-2 text-[11px] text-[#738496]">
                      <span className="flex items-center gap-1 text-[#8c9bab]">
                        <Clock className="w-3 h-3 text-[#ffab00]" />
                        {evt.all_day
                          ? startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${
                              endDate ? ` - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''
                            }`}
                      </span>
                      {evt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#4bce97]" />
                          {evt.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[#738496] text-[10px]">
                        <Globe className="w-2.5 h-2.5" />
                        {evt.timezone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(evt)}
                    title="Edit event"
                    className="p-1.5 text-[#8c9bab] hover:text-[#579dff] hover:bg-[#22272b] rounded-[3px] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEventToDelete(evt)}
                    title="Delete event"
                    className="p-1.5 text-[#8c9bab] hover:text-[#e2483d] hover:bg-[#22272b] rounded-[3px] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Event Modal */}
      {modalState && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#161a1d] border border-[#282e33] rounded-[4px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#282e33] bg-[#181b1f]">
              <h3 className="text-xs font-semibold text-[#c7d1db] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#579dff]" />
                <span>{modalState.mode === 'create' ? 'Schedule New Event' : 'Edit Calendar Event'}</span>
              </h3>
              <button
                onClick={closeModal}
                className="text-[#8c9bab] hover:text-[#c7d1db] p-1 rounded-[3px] hover:bg-[#22272b] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-4 space-y-3.5">
              {errorMessage && (
                <div className="p-2.5 rounded-[3px] bg-[#e2483d]/15 border border-[#e2483d]/30 text-[#f87171] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-[#8c9bab] mb-1">
                  Event Title <span className="text-[#e2483d]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sprint 2 Retrospective"
                  className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#8c9bab] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agenda notes, links, or objectives..."
                  className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8c9bab] mb-1">
                    Starts At <span className="text-[#e2483d]">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] focus:outline-none focus:border-[#579dff]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8c9bab] mb-1">Ends At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] focus:outline-none focus:border-[#579dff]"
                  />
                </div>
              </div>

              {/* BR-002 Warning display */}
              {endsAt && startsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime() && (
                <div className="p-2 rounded-[3px] bg-[#ffab00]/10 border border-[#ffab00]/30 text-[#ffab00] text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Validation Error: End time must be strictly after start time (BR-002).</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8c9bab] mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Room 4B / Zoom"
                    className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8c9bab] mb-1">Timezone (IANA)</label>
                  <input
                    type="text"
                    value={eventTimezone}
                    onChange={(e) => setEventTimezone(e.target.value)}
                    placeholder="e.g. Asia/Jakarta"
                    className="w-full bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allDayCheckbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded-[2px] bg-[#22272b] border-[#282e33] text-[#579dff] focus:ring-0 focus:outline-none"
                />
                <label htmlFor="allDayCheckbox" className="text-xs text-[#8c9bab] cursor-pointer">
                  All day event
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#282e33]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 rounded-[3px] text-xs font-medium text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={Boolean(validationError) || isSubmitting}
                  className="bg-[#579dff] hover:bg-[#85b8ff] disabled:opacity-50 text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : modalState.mode === 'create' ? (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Event</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161a1d] border border-[#282e33] rounded-[4px] shadow-2xl p-4.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-2.5 text-[#e2483d] mb-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-[#c7d1db]">Delete Calendar Event</h3>
            </div>
            <p className="text-xs text-[#8c9bab] leading-relaxed mb-4">
              Are you sure you want to delete <span className="font-semibold text-[#c7d1db]">&quot;{eventToDelete.title}&quot;</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-[3px] text-xs font-medium text-[#8c9bab] hover:text-[#c7d1db] hover:bg-[#22272b] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="bg-[#e2483d] hover:bg-[#f87171] disabled:opacity-50 text-white px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {isSubmitting ? <span>Deleting...</span> : <span>Delete</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
