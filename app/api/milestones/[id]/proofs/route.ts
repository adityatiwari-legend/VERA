import { NextResponse } from 'next/server';
import { requireAuth, requireRole, AppError } from '@/lib/permissions';
import { submitProofSchema } from '@/lib/validation';
import { createProof, getProofsForMilestone, UploadedFileInput } from '@/lib/proofs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: milestoneId } = await params;

    const proofs = await getProofsForMilestone(milestoneId, user);
    return NextResponse.json({ proofs });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in GET /api/milestones/[id]/proofs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireRole(['ORGANIZATION', 'ADMIN']);
    const { id: milestoneId } = await params;

    // Parse multipart/form-data
    const formData = await request.formData();

    const rawClaimed = formData.get('claimed_amount');
    const rawDesc = formData.get('description');

    const validated = submitProofSchema.safeParse({
      claimed_amount: rawClaimed,
      description: rawDesc,
    });

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Extract uploaded files from form data
    const files: UploadedFileInput[] = [];
    const formEntries = formData.getAll('files');
    const singleFile = formData.get('file');

    const allFiles = [...formEntries, ...(singleFile ? [singleFile] : [])];

    for (const item of allFiles) {
      if (item && typeof item === 'object' && 'arrayBuffer' in item) {
        const fileObj = item as File;
        if (fileObj.size > 0 && fileObj.name) {
          const arrayBuf = await fileObj.arrayBuffer();
          files.push({
            originalName: fileObj.name,
            mimeType: fileObj.type || 'application/octet-stream',
            buffer: Buffer.from(arrayBuf),
          });
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one proof file must be provided (PDF, JPG, PNG, WEBP).' },
        { status: 400 }
      );
    }

    const proof = await createProof(user.id, milestoneId, validated.data, files);

    return NextResponse.json({ proof }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error in POST /api/milestones/[id]/proofs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
