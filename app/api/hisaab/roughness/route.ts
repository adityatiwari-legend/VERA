import { NextRequest, NextResponse } from 'next/server';
import { AppError } from '@/lib/permissions';
import { requireAnyAuth } from '@/lib/api_auth';
import { submitRoughnessSchema } from '@/lib/validation';
import { recordRoughnessReadings, getRoughnessReadings } from '@/lib/tiger';

export const dynamic = 'force-dynamic';

/**
 * Drive-by road roughness telemetry from the phone accelerometer
 * (DeviceMotionEvent batch). Stored on Tiger Data hypertables with
 * local-Postgres fallback.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAnyAuth(req);

    const parsed = submitRoughnessSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { report_id, device_label, readings } = parsed.data;
    const result = await recordRoughnessReadings(
      report_id,
      device_label,
      readings.map((r) => ({
        accel_z: r.accel_z,
        speed_kmh: r.speed_kmh ?? null,
        recorded_at: r.recorded_at ?? null,
      }))
    );

    const summary = await getRoughnessReadings(report_id);
    const abs = summary.rows.map((r) => Math.abs(r.accel_z));
    const score = abs.length ? abs.reduce((a, b) => a + b, 0) / abs.length : null;

    return NextResponse.json(
      { store: result.store, inserted: result.inserted, samples: abs.length, roughness_score: score },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('POST /api/hisaab/roughness error:', error);
    return NextResponse.json({ error: 'Failed to record roughness' }, { status: 500 });
  }
}
