import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCampaignById } from '@/lib/campaigns';
import { EditCampaignClient } from './EditCampaignClient';
import Link from 'next/link';

export default async function EditCampaignPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const campaign = await getCampaignById(params.id);
  if (!campaign) {
    notFound();
  }

  if (user.role === 'ORGANIZATION' && campaign.ngo_id !== user.id) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-xl border border-bad/25 bg-white p-8 shadow-card">
          <h2 className="text-xl font-semibold text-bad">Access Denied</h2>
          <p className="mt-2 text-sm text-mute">
            You do not have permission to edit this campaign.
          </p>
          <Link
            href="/org/campaigns"
            className="btn-secondary mt-6 inline-flex items-center gap-2 !px-4 !py-2 !text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-xl border border-warn/25 bg-white p-8 shadow-card">
          <h2 className="text-xl font-semibold text-warn">Campaign Immutable</h2>
          <p className="mt-2 text-sm text-mute">
            This campaign is marked as {campaign.status} and can no longer be edited.
          </p>
          <Link
            href={`/org/campaigns/${campaign.id}`}
            className="btn-secondary mt-6 inline-flex items-center gap-2 !px-4 !py-2 !text-xs"
          >
            View Campaign Details
          </Link>
        </div>
      </div>
    );
  }

  return <EditCampaignClient campaign={campaign} />;
}
