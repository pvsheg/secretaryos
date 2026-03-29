import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET — get user's referral code and stats
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(n: string) { return cookieStore.get(n)?.value }, set() {}, remove() {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Get or create referral record
    let { data: referral } = await supabase
      .from('referrals')
      .select('referral_code, status')
      .eq('referrer_id', user.id)
      .is('referee_id', null)  // The user's own referral code entry
      .single()

    if (!referral) {
      // Generate a new referral code
      const { data: newCode } = await supabase
        .rpc('generate_referral_code', { user_id: user.id })

      await supabase.from('referrals').insert({
        referrer_id: user.id,
        referral_code: newCode,
        status: 'active',
      })

      referral = { referral_code: newCode, status: 'active' }
    }

    // Get referral stats
    const { data: stats } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', user.id)
      .not('referee_id', 'is', null)

    const signedUp = stats?.filter(s => ['signed_up', 'converted', 'rewarded'].includes(s.status)).length || 0
    const converted = stats?.filter(s => ['converted', 'rewarded'].includes(s.status)).length || 0
    const freeMonthsEarned = stats?.filter(s => s.status === 'rewarded').length || 0

    // Get subscription info
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('free_months_earned, free_months_used')
      .eq('user_id', user.id)
      .single()

    const referralUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://secretaryos.in'}/?ref=${referral.referral_code}`

    return NextResponse.json({
      referral_code: referral.referral_code,
      referral_url: referralUrl,
      stats: {
        signed_up: signedUp,
        converted: converted,
        free_months_earned: freeMonthsEarned,
        free_months_balance: (sub?.free_months_earned || 0) - (sub?.free_months_used || 0),
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST — track a referral signup
export async function POST(req: NextRequest) {
  try {
    const { referral_code, referee_email } = await req.json()
    if (!referral_code) return NextResponse.json({ error: 'No referral code' }, { status: 400 })

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(n: string) { return cookieStore.get(n)?.value }, set() {}, remove() {} } }
    )

    // Find the referral code record
    const { data: existing } = await supabase
      .from('referrals')
      .select('referrer_id, referee_id')
      .eq('referral_code', referral_code)
      .single()

    if (!existing) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })

    // Anti-abuse: check if referee email matches referrer email domain
    if (referee_email && existing.referrer_id) {
      const { data: referrer } = await supabase.auth.admin.getUserById(existing.referrer_id)
      if (referrer?.user?.email) {
        const referrerDomain = referrer.user.email.split('@')[1]
        const refereeDomain = referee_email.split('@')[1]
        if (referrerDomain === refereeDomain) {
          return NextResponse.json({ error: 'Self-referral not allowed' }, { status: 400 })
        }
      }
    }

    // Update referral record with referee signup
    await supabase
      .from('referrals')
      .update({ referee_email, status: 'signed_up', signed_up_at: new Date().toISOString() })
      .eq('referral_code', referral_code)
      .is('referee_id', null)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
