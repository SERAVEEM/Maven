import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import { Clock, MapPin, Plus } from 'lucide-react';

export const CalendarAgendaView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const list = await ipc.getCalendarEvents();
    setEvents(list);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await ipc.createCalendarEvent({
        title,
        starts_at: new Date(startsAt).toISOString(),
        location: location || undefined,
        timezone: 'Asia/Jakarta',
      });
      setTitle('');
      setStartsAt('');
      setLocation('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full bg-[#1d2125] text-[#b6c2cf] font-sans">
      <div className="pb-4 border-b border-[#282e33]">
        <h2 className="text-xl font-bold tracking-tight text-[#c7d1db]">Calendar Agenda</h2>
        <p className="text-xs text-[#8c9bab] mt-0.5">
          Chronological schedule and sprint milestone calendar
        </p>
      </div>

      {/* Quick Add Event */}
      <form
        onSubmit={handleCreate}
        className="mt-4 p-3.5 rounded-[4px] border border-[#282e33] bg-[#161a1d] flex flex-wrap gap-2.5"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event summary..."
          className="flex-1 min-w-[200px] bg-[#22272b] border border-[#282e33] rounded-[3px] px-3 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff]"
        />
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] focus:outline-none focus:border-[#579dff]"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="bg-[#22272b] border border-[#282e33] rounded-[3px] px-2.5 py-1.5 text-xs text-[#c7d1db] placeholder-[#738496] focus:outline-none focus:border-[#579dff] w-36"
        />
        <button
          type="submit"
          disabled={!title.trim() || !startsAt || isSubmitting}
          className="bg-[#579dff] hover:bg-[#85b8ff] disabled:opacity-50 text-[#1d2125] px-3.5 py-1.5 rounded-[3px] text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule</span>
        </button>
      </form>

      {/* Events Timeline */}
      <div className="mt-5 flex-1 overflow-y-auto space-y-2 pr-1">
        {events.length === 0 ? (
          <div className="text-center py-16 text-[#738496] text-xs">
            No events scheduled yet.
          </div>
        ) : (
          events.map((evt) => {
            const dateObj = new Date(evt.starts_at);
            return (
              <div
                key={evt.id}
                className="p-3.5 rounded-[4px] border border-[#282e33] bg-[#161a1d] hover:border-[#3b444c] transition-colors flex items-start justify-between"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-[3px] bg-[#22272b] border border-[#282e33] flex flex-col items-center justify-center text-[#579dff] flex-shrink-0">
                    <span className="text-[9px] uppercase font-bold text-[#8c9bab]">
                      {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-sm font-bold leading-none text-[#c7d1db]">{dateObj.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#c7d1db] text-xs">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-[11px] text-[#8c9bab] mt-0.5">{evt.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#738496]">
                      <span className="flex items-center gap-1 text-[#8c9bab]">
                        <Clock className="w-3 h-3 text-[#ffab00]" />
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {evt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#4bce97]" />
                          {evt.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
