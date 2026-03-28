import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Parse CIN to extract guaranteed-accurate info — no API needed
function parseCIN(cin: string) {
  if (!cin || cin.length !== 21) return null

  const stateCodes: Record<string, string> = {
    'KA': 'Karnataka', 'MH': 'Maharashtra', 'DL': 'Delhi',
    'TN': 'Tamil Nadu', 'GJ': 'Gujarat', 'WB': 'West Bengal',
    'UP': 'Uttar Pradesh', 'RJ': 'Rajasthan', 'TS': 'Telangana',
    'AP': 'Andhra Pradesh', 'KL': 'Kerala', 'PB': 'Punjab',
    'HR': 'Haryana', 'MP': 'Madhya Pradesh', 'OR': 'Odisha',
    'AS': 'Assam', 'BR': 'Bihar', 'JH': 'Jharkhand',
    'GA': 'Goa', 'HP': 'Himachal Pradesh', 'UK': 'Uttarakhand',
    'MN': 'Manipur', 'TR': 'Tripura', 'ML': 'Meghalaya',
    'NL': 'Nagaland', 'AR': 'Arunachal Pradesh', 'MZ': 'Mizoram',
    'SK': 'Sikkim', 'CH': 'Chandigarh', 'PY': 'Puducherry',
    'LD': 'Lakshadweep', 'AN': 'Andaman & Nicobar', 'DN': 'Dadra & Nagar Haveli',
    'DD': 'Daman & Diu', 'JK': 'Jammu & Kashmir', 'LA': 'Ladakh',
  }

  const companyTypes: Record<string, string> = {
    'PTC': 'Private Limited', 'PLC': 'Public Limited',
    'OPC': 'One Person Company', 'FLC': 'Foreign Company',
    'NPL': 'Section 8 Company', 'LLP': 'Limited Liability Partnership',
    'GOI': 'Government Company', 'SGC': 'State Government Company',
    'ULL': 'Unlimited Liability', 'FGN': 'Foreign',
  }

  const stateCode = cin.substring(6, 8)
  const yearOfIncorporation = cin.substring(8, 12)
  const companyType = cin.substring(12, 15)

  return {
    listing_status: cin[0] === 'L' ? 'Listed' : 'Unlisted',
    state: stateCodes[stateCode] || stateCode,
    state_code: stateCode,
    year_of_incorporation: yearOfIncorporation,
    company_type: companyTypes[companyType] || companyType,
    financial_year_end: 'March 31',
  }
}

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

    // Step 1 — Always parse CIN structure (instant, offline)
    const cinData = parseCIN(cinUpper)

    // Step 2 — Search YOUR OWN Supabase database first (free, instant)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set() {},
          remove() {},
        },
      }
    )

    const { data: company, error: dbError } = await supabase
      .from('mca_companies')
      .select('*')
      .eq('cin', cinUpper)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('DB lookup error:', dbError)
    }

    // Step 3 — Build response
    if (company) {
      // Found in our own database — return immediately, zero API cost
      return NextResponse.json({
        cin: cinUpper,
        company_name: company.company_name,
        registered_office: company.registered_office_address,
        company_status: company.company_status,
        company_class: company.company_class,
        company_category: company.company_category,
        authorized_capital: company.authorized_capital,
        paidup_capital: company.paidup_capital,
        registration_date: company.registration_date,
        listing_status: company.listing_status,
        industrial_classification: company.industrial_classification,
        // From CIN parsing
        state: cinData?.state,
        state_code: cinData?.state_code,
        company_type: cinData?.company_type || company.company_class,
        year_of_incorporation: cinData?.year_of_incorporation,
        financial_year_end: 'March 31',
        // Meta
        source: 'local_db',
        mca_fetch_success: true,
        mca_last_synced: null, // Not synced via Probe42 yet
        fetched_at: new Date().toISOString(),
      })
    }

    // Step 4 — Not found in our database
    // Return what we can from CIN parsing + tell the CS to fill in manually
    return NextResponse.json({
      cin: cinUpper,
      company_name: null,
      registered_office: null,
      company_status: 'Active',
      company_type: cinData?.company_type || null,
      state: cinData?.state || null,
      state_code: cinData?.state_code || null,
      year_of_incorporation: cinData?.year_of_incorporation || null,
      financial_year_end: 'March 31',
      listing_status: cinData?.listing_status || null,
      source: 'cin_parse_only',
      mca_fetch_success: false,
      fetched_at: new Date().toISOString(),
      message: `Company not found in our database. We identified this as a ${cinData?.company_type || 'company'} registered in ${cinData?.state || 'India'} in ${cinData?.year_of_incorporation || 'unknown year'}. Please fill in the remaining details manually.`
    })

  } catch (error: any) {
    console.error('Fetch company error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please fill in the details manually.' },
      { status: 500 }
    )
  }
}
