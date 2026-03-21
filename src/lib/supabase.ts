import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://rzutjhmaoagjdrjefvzh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dXRqaG1hb2FnamRyamVmdnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDEyNDYsImV4cCI6MjA4ODMxNzI0Nn0.u0rz6H5ONuCk-FpXhUmKqD6YoYReHqqO4Znz7Z1OvVg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
