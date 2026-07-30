import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Settings from '@/models/Settings';
import { DEFAULT_SETTINGS } from '@/engine/types';

export async function GET() {
  try {
    await connectDB();
    let doc = await Settings.findOne();
    if (!doc) {
      doc = await Settings.create({ settings: DEFAULT_SETTINGS });
    }
    return NextResponse.json(doc.settings);
  } catch (error) {
    console.error('[API] Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const newSettings = await req.json();
    await connectDB();

    // Since this is a single user app, we just update the first document or create it
    let doc = await Settings.findOne();
    if (doc) {
      doc.settings = newSettings;
      await doc.save();
    } else {
      doc = await Settings.create({ settings: newSettings });
    }

    return NextResponse.json(doc.settings);
  } catch (error) {
    console.error('[API] Error saving settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
