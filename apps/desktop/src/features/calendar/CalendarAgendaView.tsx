import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@maven/contracts';
import { ipc } from '../../lib/ipc';
import { Calendar, Clock, MapPin, Plus } from 'lucide-react';

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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-5xl mx-auto w-full">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-bold tracking-tight text-white">Calendar Agenda</h2>
        <p className="text-sm text-slate-400">
          Jadwal aktivitas dan agenda mendatang dalam tampilan kronologis ringkas (MVP v0.1)
        </p>
      </div>

      {/* Quick Add Event */}
      <form onSubmit={handleCreate} className="mt-5 p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul acara / agenda..."
          className="flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Lokasi (opsional)"
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36"
        />
        <button
          type="submit"
          disabled={!title.trim() || !startsAt || isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Jadwalkan</span>
        </button>
      </form>

      {/* Events Timeline */}
      <div className="mt-6 flex-1 overflow-y-auto space-y-3 pr-1">
        {events.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Belum ada agenda kalender yang dijadwalkan.
          </div>
        ) : (
          events.map((evt) => {
            const dateObj = new Date(evt.starts_at);
            return (
              <div
                key={evt.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all flex items-start justify-between"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center text-indigo-400 flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold">
                      {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-base font-black leading-none">{dateObj.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{evt.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {evt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
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

