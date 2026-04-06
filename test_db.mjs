import fetch from "node-fetch";

const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const phone = "573167761022";
// Try auth users find
const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
});
const data = await response.json();

let foundUser = null;
for(let u of data.users) {
   if(!u.user_metadata) continue;
   let cod = u.user_metadata.codigo_pais ? u.user_metadata.codigo_pais.replace('+', '') : '';
   let tel = u.user_metadata.telefono || '';
   if(cod + tel === phone) { foundUser = u; break; }
}

console.log("Found User:", foundUser?.id);
