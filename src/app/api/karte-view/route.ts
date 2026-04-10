// This file is kept for backwards compatibility.
// The karte-view feature now uses /api/karte-view/auth, /search, /detail endpoints.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Use /api/karte-view/auth instead' }, { status: 410 })
}
