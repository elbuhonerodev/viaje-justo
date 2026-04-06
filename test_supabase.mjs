const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
    }
});

const data = await response.json();
console.log(JSON.stringify(data.users?.map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })), null, 2));
