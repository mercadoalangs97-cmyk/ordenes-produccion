import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = 'https://foohwhgkidprcbysmrfw.supabase.co'
const SUPABASE_KEY = 'sb_publishable_f_LP0FRElYjykFezxIICPQ_1SYjKQSL'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
