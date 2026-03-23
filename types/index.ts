export interface Client {
  id: string
  user_id: string
  company_name: string
  cin: string
  registered_office: string
  financial_year_end: string
  authorised_capital?: string
  paid_up_capital?: string
  created_at: string
  directors?: Director[]
}

export interface Director {
  id: string
  client_id: string
  name: string
  din: string
  designation: string
  email?: string
  is_active: boolean
}

export interface Document {
  id: string
  client_id: string
  user_id: string
  type: 'board_minutes' | 'agm_notice' | 'roc_filing' | 'other'
  title: string
  content: string
  metadata: {
    meeting_date?: string
    meeting_venue?: string
    agenda_items?: string
    directors_present?: string
  }
  created_at: string
  client?: Client
}

export interface GenerateRequest {
  client_id: string
  company_name: string
  cin: string
  registered_office: string
  meeting_date: string
  meeting_venue: string
  directors_present: string
  agenda_items: string
  financial_year_end: string
}
