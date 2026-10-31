import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/permissions';
import { listNotifications, unreadCount, markNotificationsRead } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    if (unreadOnly) {
      const unread = await unreadCount(user.id);
      return NextResponse.json({ unread });
    }

    const notifications = await listNotifications(user.id);
    const unread = await unreadCount(user.id);
    return NextResponse.json({ notifications, unread });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    let ids: string[] | undefined;
    try {
      const body = await req.json();
      if (Array.isArray(body?.ids)) ids = body.ids;
    } catch {
      // mark all
    }
    await markNotificationsRead(user.id, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
