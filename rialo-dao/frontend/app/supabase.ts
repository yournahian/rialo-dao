import { createClient } from '@supabase/supabase-js';

// Replace these with your actual keys from Supabase Settings -> API
const SUPABASE_URL = 'https://csqumcclvcqagscgfzvi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcXVtY2NsdmNxYWdzY2dmenZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTM0MjMsImV4cCI6MjA4NTQyOTQyM30.KnZVL4fT73kGEzCoYzmOKygGUot4Tig3rmanbjAcmQc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);