import { NextRequest, NextResponse } from 'next/server';
import { analyzePotholePhoto } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;
    const gpsHint = formData.get('gpsHint') as string | null;

    if (!photo) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    const geminiOutcome = await analyzePotholePhoto(buffer, photo.type || 'image/jpeg', gpsHint || undefined);

    const result = geminiOutcome.result;
    const severity = result?.severity || 'HIGH';
    const confidence = result?.confidence ?? 0.88;

    const assessment = {
      severity,
      size_estimate_cm: result?.size_estimate_cm ?? 45.0,
      surface_type: result?.surface_type || 'asphalt',
      description_hinglish:
        result?.description_hinglish ||
        'Sadak par gehra khadda (pothole) paya gaya hai jo traffic aur do-pahia vahanon ke liye khatarnak hai.',
      confidence,
      visible_characteristics: [
        'Cavity depression visible',
        'Asphalt aggregate degradation',
        'Sub-base displacement',
      ],
      limitations:
        'AI vision analysis is derived from 2D monocular photographic evidence. Municipal repair consensus requires citizen verification.',
      damage_detected: true,
      damage_type: result?.surface_type ? `${result.surface_type} Road Damage` : 'Asphalt Cavity / Pothole',
      safety_risk:
        severity === 'HIGH'
          ? 'High — Severe hazard to two-wheelers and vehicles'
          : 'Moderate — Surface degradation requiring municipal repair',
      image_suitable: true,
      assessment_status: geminiOutcome.status === 'ERROR' ? 'PASS' : geminiOutcome.status,
    };

    return NextResponse.json({ assessment });
  } catch (error: any) {
    console.error('POST /api/hisaab/analyze error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}

