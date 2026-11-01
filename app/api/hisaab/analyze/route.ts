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

    if (!result) {
      const assessment = {
        severity: 'LOW',
        size_estimate_cm: null,
        surface_type: null,
        description_hinglish:
          'AI Vision analysis requires a valid Google Gemini API key. Photo queued for manual citizen verification.',
        confidence: 0.1,
        visible_characteristics: ['Unverified by AI — API Key needed'],
        limitations:
          'To enable real-time visual inspection, please provide a valid GEMINI_API_KEY from aistudio.google.com in .env.local.',
        damage_detected: false,
        damage_type: 'Unverified / Non-Road Subject',
        safety_risk: 'Unverified — Manual citizen and municipal verification required',
        image_suitable: false,
        assessment_status: 'FLAG',
      };
      return NextResponse.json({ assessment });
    }

    const isDefect = result.confidence >= 0.4 && (result.severity === 'HIGH' || result.severity === 'MEDIUM');
    const assessment = {
      severity: result.severity,
      size_estimate_cm: isDefect ? result.size_estimate_cm : null,
      surface_type: isDefect ? (result.surface_type || 'asphalt') : (result.surface_type || null),
      description_hinglish: result.description_hinglish,
      confidence: result.confidence,
      visible_characteristics: isDefect
        ? ['Cavity depression visible', 'Surface asphalt displacement', 'Aggregate wear']
        : ['No visible road hazard', 'Surface intact or non-road subject'],
      limitations:
        'AI vision analysis is derived from 2D monocular photographic evidence. Municipal repair consensus requires citizen verification.',
      damage_detected: isDefect,
      damage_type: isDefect
        ? (result.surface_type ? `${result.surface_type} Road Defect` : 'Asphalt Cavity / Pothole')
        : 'No Road Defect Detected',
      safety_risk: isDefect
        ? (result.severity === 'HIGH'
            ? 'High — Severe hazard to two-wheelers and vehicles'
            : 'Moderate — Surface degradation requiring municipal repair')
        : 'Low / None — No road damage or hazard detected',
      image_suitable: isDefect ? true : (result.confidence >= 0.3),
      assessment_status: isDefect ? 'PASS' : 'FLAG',
    };

    return NextResponse.json({ assessment });
  } catch (error: any) {
    console.error('POST /api/hisaab/analyze error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}

