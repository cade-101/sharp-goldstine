import { supabase } from './supabase';

const BASE_URL = 'https://rzutjhmaoagjdrjefvzh.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dXRqaG1hb2FnamRyamVmdnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDEyNDYsImV4cCI6MjA4ODMxNzI0Nn0.u0rz6H5ONuCk-FpXhUmKqD6YoYReHqqO4Znz7Z1OvVg';

export async function callEdgeFunction(name: string, payload: object): Promise<unknown> {
  const { data: { session } } = await supabase.auth.getSession();

  const resp = await fetch(`${BASE_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${session?.access_token ?? ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${name} ${resp.status}: ${err.slice(0, 200)}`);
  }

  return resp.json();
}
