'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Notification } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [marking, setMarking] = useState(false);

  const load = () => {
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotifications(d?.notifications ?? []))
      .catch(() => setNotifications([]));
  };

  useEffect(load, []);

  const markAll = async () => {
    setMarking(true);
    try {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      load();
    } finally {
      setMarking(false);
    }
  };

  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-20">
      <div className="flex items-center justify-between border-b border-line pb-5">
        <div className="flex items-center gap-2.5">
          <Bell className="h-5 w-5 text-accent" />
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Notifications</h1>
          {unread > 0 && <span className="chip !bg-accent-faint !text-accent-deep">{unread} new</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} disabled={marking} className="btn-secondary !px-3 !py-1.5 !text-xs">
            {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      {notifications === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-mute" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center text-sm text-mute">
          Nothing yet. Activity on your reports, jobs, campaigns and releases shows up here.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`card p-4 ${!n.read_at ? 'border-accent/25 bg-accent-faint/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs leading-relaxed text-mute">{n.body}</p>}
                </div>
                <span className="shrink-0 font-mono text-[10px] text-mute">
                  {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              {n.link && (
                <Link href={n.link} className="mt-2 inline-block font-mono text-[11px] font-semibold text-accent hover:underline">
                  Open →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
