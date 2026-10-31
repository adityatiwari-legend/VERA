import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="card border-bad/20 bg-bad-soft/40 p-8 space-y-3">
          <ShieldAlert className="mx-auto h-10 w-10 text-bad" />
          <h2 className="text-lg font-bold text-bad">Admin access required</h2>
          <p className="text-xs text-mute">
            The VERA admin console is restricted to platform ADMIN accounts.
          </p>
          <Link
            href={user.role === 'AUDITOR' ? '/auditor/dashboard' : '/dashboard'}
            className="btn-secondary mt-4 !text-xs"
          >
            Go to your workspace
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
