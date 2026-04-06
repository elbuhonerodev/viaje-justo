

const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPERADMIN_ID = "6f253afb-a7d9-449e-86c8-7326daadbc4f";

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`
};

async function run() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
  const data = await res.json();
  const users = data.users || [];
  
  for (const u of users) {
    if (u.id === SUPERADMIN_ID) continue;
    console.log(`Borrando ${u.email} (${u.id})...`);
    
    // Dependencias
    await fetch(`${SUPABASE_URL}/rest/v1/gastos?viaje_id=in.(select id from public.viajes where user_id='${u.id}')`, { method: 'DELETE', headers });
    await fetch(`${SUPABASE_URL}/rest/v1/participantes?user_id=eq.${u.id}`, { method: 'DELETE', headers });
    await fetch(`${SUPABASE_URL}/rest/v1/viajes?user_id=eq.${u.id}`, { method: 'DELETE', headers });
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u.id}`, { method: 'DELETE', headers });
    
    const dRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers });
    if (dRes.ok) {
       console.log(`✅ Cuenta eliminada`);
    } else {
       console.error(`❌ Falló la eliminación:`, await dRes.text());
    }
  }
}
run();
