import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    hash: string;
  };
}

export default function TxRedirectPage({ params }: PageProps) {
  redirect(`/explorer/tx/${params.hash}`);
}
