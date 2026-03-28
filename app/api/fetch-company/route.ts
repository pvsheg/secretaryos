import { NextRequest, NextResponse } from 'next/server'

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || ''

export async function POST(req: NextRequest) {
  try {
    const { cin } = await req.json()

    if (!cin || cin.replace(/\s/g, '').length !== 21) {
      return NextResponse.json(
        { error: 'Please enter a valid 21-character CIN.' },
        { status: 400 }
      )
    }

    const cinUpper = cin.toUpperCase().replace(/\s/g, '')

    if (!WORKER_URL) {
      return NextResponse.json(
        { error: 'MCA lookup not configured. Please fill in details manually.', found: false },
        { status: 503 }
      )
    }

    // Call Cloudflare Worker
    const res = await fetch(`${WORKER_URL}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cin: cinUpper }),
      signal: AbortSignal.timeout(8000),
    })

    const data = await res.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Fetch company error:', error)
    return NextResponse.json(
      { error: 'Could not reach MCA database. Please fill in details manually.', found: false },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const state = searchParams.get('state')

    if (!q || q.length < 3) {
      return NextResponse.json({ error: 'Search query must be at least 3 characters.' }, { status: 400 })
    }

    if (!WORKER_URL) {
      return NextResponse.json({ results: [], count: 0 })
    }

    const params = new URLSearchParams({ q, limit: '15' })
    if (state) params.set('state', state)

    const res = await fetch(`${WORKER_URL}/search?${params}`, {
      signal: AbortSignal.timeout(8000),
    })

    const data = await res.json()
    return NextResponse.json(data)

  } catch (error: any) {
    return NextResponse.json({ results: [], count: 0, error: error.message })
  }
}
