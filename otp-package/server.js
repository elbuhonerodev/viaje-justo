import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
// Habilitar CORS para que la app Vue consuma la API directamente desde el navegador de los usuarios
app.use(cors());

// Servir el build de producción Vue (dist/) como archivos estáticos
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

// Almacén temporal de códigos OTP en memoria { "teléfono": "código" }
const otps = new Map();

// EVOLUTION API CONF
const EVOLUTION_URL = "https://ws-manager.viaje-justo.xyz/message/sendText/ViajeJusto";
const EVOLUTION_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

// RUTA PARA ESTABLECER UN CÓDIGO (Pedido desde Vue Signup)
app.post('/request-otp', async (req, res) => {
  try {
    const { phone, isSignup } = req.body;
    if (!phone) return res.status(400).json({ error: "No phone specified" });

    // AÑADIDO: Si es registro, verifica que el número no esté usado ya en otro perfil
    if (isSignup) {
      const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
      const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?telefono=eq.${phone}&select=id`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      });
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: "Este número de WhatsApp ya está registrado en otra cuenta." });
      }
    }

    // Generar código aleatorio de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardarlo en memoria para este teléfono (Sobreescribe si ya había pedido)
    otps.set(phone, code);

    // Borrar de la memoria en 15 minutos (por seguridad)
    setTimeout(() => {
      if (otps.get(phone) === code) otps.delete(phone);
    }, 15 * 60 * 1000);

    // Enviarlo a Evolution API
    const response = await fetch(EVOLUTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone, 
        text: `✈️ *Viaje Justo*\n\nTu código de seguridad único es: *${code}*\nIngrésalo en la plataforma para continuar.`,
      })
    });

    if (response.ok) {
      console.log(`[WA GENERATDO NUEVO OTP] a ${phone}`);
      return res.status(200).json({ status: "success" });
    } else {
      console.error("Fallo API Whatsapp:", await response.text());
      return res.status(500).json({ error: "Fallo conexión WA" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RUTA PARA VERIFICAR UN CÓDIGO (Pedido desde Vue Verificación)
app.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Información incompleta" });

    const savedCode = otps.get(phone);

    if (savedCode && savedCode === code) {
        // Exito
        otps.delete(phone); // Burn it!
        console.log(`[OTP VERIFICADO] de ${phone}`);

        // ENVIAR MENSAJE DE BIENVENIDA DE TRAVEL-JUST
        try {
            await fetch(EVOLUTION_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                    number: phone,
                    text: `¡Tu activación ha sido un ÉXITO! 🎉\n\nHola, soy *Travel-Just* ✈️, seré tu asistente personal y te ayudaré en:\n\n• Modificar tu presupuesto o nombre.\n• Recomendar lugares turísticos exóticos.\n• Buscar Hoteles y Restaurantes cercanos.\n\n¡Estoy aquí 24/7! Escríbeme cualquier cosa para comenzar.`
                })
            });
        } catch (e) {
            console.error("No se pudo enviar el saludo de Travel-Just", e);
        }

        return res.status(200).json({ status: "success", verified: true });
    } else {
        // Fallo
        console.warn(`[OTP FALLIDO] de ${phone} esperabamos ${savedCode} pero dio ${code}`);
        return res.status(401).json({ error: "Código inválido o expirado" });
    }
});

// AÑADIDO: Ruta de prueba para webhook de Evolution API
app.post('/webhook', (req, res) => {
    console.log("[WEBHOOK RECIBIDO]", req.body);
    // Responder a Evolution con 200 OK inmediatamente para que no reintente
    return res.status(200).send("OK");
});

// AÑADIDO: Avisar al Admin Principal cuando inicie sesión
app.post('/admin-login-alert', async (req, res) => {
    try {
        const { adminEmail } = req.body;
        // Asume un número maestro, o se puede enviar desde el payload. 
        // Cambiar este número por el oficial del administrador
        const masterAdminPhone = "573186948089"; 

        const WA_API_URL = "http://38.242.235.132:8080/message/sendText/wpp";
        const WA_API_KEY = "429683C4C977415CAAFCCE10F7D57E11";
        
        await fetch(WA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': WA_API_KEY
            },
            body: JSON.stringify({
                number: masterAdminPhone, 
                text: `🚨 *CRÍTICO - Viaje Justo*\n\nAcceso de Administrador detectado.\nEmail: ${adminEmail}\nFecha: ${new Date().toLocaleString()}`,
            })
        });
        
        return res.status(200).json({ status: "Alert sent" });
    } catch (e) {
        console.error("Error al enviar alerta a admin:", e);
        return res.status(500).json({ error: "Failed to send alert" });
    }
});

// AÑADIDO: Ruta para pedir OTP por correo (Reemplaza la autoconfirmación instantánea)
app.post('/request-email-otp', async (req, res) => {
  try {
    const { email, phone, isSignup } = req.body;
    if (!email) return res.status(400).json({ error: "Falta el correo" });

    // AÑADIDO: Si es registro, verifica que el whatsapp asociado no esté usado ya
    if (isSignup && phone) {
      const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
      const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?telefono=eq.${phone}&select=id`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      });
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return res.status(409).json({ error: "El WhatsApp ingresado ya está vinculado a otra cuenta." });
      }
    }

    // Generar código aleatorio de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardarlo en memoria para este correo
    otps.set(email, code);

    // Borrar de la memoria en 15 minutos (por seguridad)
    setTimeout(() => {
      if (otps.get(email) === code) otps.delete(email);
    }, 15 * 60 * 1000);

    const RESEND_API_KEY = "re_HSVZAuUM_5EnqYQqhDPHysFzP37KyJpsp";
    const payload = {
        from: 'Viaje Justo <verificacion@viaje-justo.xyz>', 
        to: [email],
        subject: "Código de Verificación - ViajeJusto",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h2 style="color: #4CAF50; text-align: center;">Verifica tu Correo</h2>
            <p>Hola,</p>
            <p>Tu código único de seguridad para registrarte en <strong>ViajeJusto</strong> es:</p>
            <div style="background-color: #f4f4f4; padding: 16px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; margin: 20px 0;">
                ${code}
            </div>
            <p>Ingresa este código en la plataforma para continuar. Este código expirará en 15 minutos.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">El Equipo de ViajeJusto</p>
        </div>
        `
    };

    const resResend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (resResend.ok) {
       console.log(`[EMAIL OTP ENVIADO] ✅ a ${email}`);
       return res.status(200).json({ status: "success" });
    } else {
       console.error("[EMAIL ERROR] ❌ Resend rechazó el HTTP:", await resResend.text());
       return res.status(500).json({ error: "No se pudo entregar el correo." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// AÑADIDO: Verifica el OTP de correo y crea la cuenta forzosamente en Supabase
app.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, code, password, metaData } = req.body;
    if (!email || !code || !password) return res.status(400).json({ error: "Faltan datos" });

    const savedCode = otps.get(email);
    if (!savedCode || savedCode !== code) {
        return res.status(401).json({ error: "Código inválido o expirado" });
    }

    // Si coincide, quemamos el código
    otps.delete(email);

    // Extraemos la llave de administrador inyectada.
    const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
    const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        email: email,
        password: password,
        user_metadata: metaData,
        email_confirm: true,
        phone_confirm: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
       console.error("[SUPABASE GHOST FALLO]:", data);
       return res.status(400).json({ error: data.msg || data.message || "Fallo en creación de usuario" });
    }

    console.log(`[SUPABASE GHOST CREADO PÓST-OTP]: ${email}`);

    // Enviar mensaje de bienvenida por WhatsApp
    try {
      const telefono = metaData?.telefono;
      const codigoPais = metaData?.codigo_pais || '+57';
      const nombreUsuario = metaData?.nombre || 'Viajero';

      if (telefono) {
        const numeroCompleto = codigoPais.replace('+', '') + telefono;
        const mensajeBienvenida = `🎉 ¡Bienvenido/a a *ViajeJusto*, ${nombreUsuario}! 🌎✈️\n\n` +
          `Tu cuenta ha sido creada exitosamente.\n\n` +
          `Soy tu *asistente personal de viajes* 🤖 y estoy aquí para ayudarte con todo lo que necesites:\n\n` +
          `📍 Organizar tus viajes\n` +
          `💰 Controlar presupuestos y gastos\n` +
          `🗓️ Planificar itinerarios\n` +
          `🏨 Recomendaciones de destinos\n` +
          `👥 Coordinar viajes grupales\n\n` +
          `Puedes escribirme en cualquier momento por aquí y te ayudaré con lo que necesites. ¡Estoy listo para hacer de tu próximo viaje una experiencia increíble! 🚀\n\n` +
          `_Escribe "Hola" para comenzar_ 👋`;

        await fetch(EVOLUTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify({
            number: numeroCompleto,
            text: mensajeBienvenida
          })
        });
        console.log(`[BIENVENIDA WHATSAPP] ✅ Enviada a ${numeroCompleto}`);
      }
    } catch (welcomeErr) {
      console.error('[BIENVENIDA WHATSAPP] ⚠️ Error (no crítico):', welcomeErr.message);
    }

    return res.status(200).json({ status: "success", user: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Health check para Easypanel / Estado
app.get('/health', (req, res) => {
    return res.status(200).send("OTP Server is running!");
});

// AÑADIDO: Rutas internas secretas para consultar datos de Base de Datos para el AI Agent
app.post('/bot/checkUser', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: "No phone specified" });

        const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
        const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
        
        const headers = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

        // 1. Fetch Users
        const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
        const usersData = await usersRes.json();
        let foundUser = null;

        for (let u of (usersData.users || [])) {
            if (!u.user_metadata) continue;
            let cod = u.user_metadata.codigo_pais ? u.user_metadata.codigo_pais.replace('+', '') : '';
            let tel = u.user_metadata.telefono || '';
            if (cod + tel === phone) { foundUser = u; break; }
        }

        if (!foundUser) {
            return res.status(200).json({ registered: false });
        }

        const userId = foundUser.id;
        const nombre_completo = `${foundUser.user_metadata.nombre} ${foundUser.user_metadata.apellido}`;

        // 2. Check if ADMIN (tiene viajes originados por él)
        const vRes = await fetch(`${SUPABASE_URL}/rest/v1/viajes?user_id=eq.${userId}&select=*&limit=1`, { headers });
        const vData = await vRes.json();

        if (vData && vData.length > 0) {
            return res.status(200).json({ 
                registered: true, 
                role: "ADMINISTRADOR", 
                user_id: userId,
                nombre: nombre_completo,
                viaje_id: vData[0].id
            });
        }

        // 3. Check if INVITADO (está en tabla de participantes)
        const pRes = await fetch(`${SUPABASE_URL}/rest/v1/participantes?user_id=eq.${userId}&select=*&limit=1`, { headers });
        const pData = await pRes.json();

        if (pData && pData.length > 0) {
            return res.status(200).json({ 
                registered: true, 
                role: "INVITADO", 
                user_id: userId,
                nombre: pData[0].nombre || nombre_completo,
                participante_id: pData[0].id,
                viaje_id: pData[0].viaje_id,
                aporte: pData[0].aporte
            });
        }

        // 4. Registrado pero sin viajes aún
        return res.status(200).json({ 
            registered: true, 
            role: "NUEVO_USUARIO", 
            user_id: userId, 
            nombre: nombre_completo 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Fallo DB interno" });
    }
});

// =============================================
// ADMIN DASHBOARD ENDPOINTS
// =============================================
const ADMIN_SB_URL = "https://supabase.viaje-justo.xyz";
const ADMIN_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

// Middleware: verifica que el llamador sea super_admin
const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const userRes = await fetch(`${ADMIN_SB_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}`, 'apikey': ADMIN_SB_KEY }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Token inválido o expirado' });
    const userData = await userRes.json();

    const profileRes = await fetch(
      `${ADMIN_SB_URL}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      { headers: { 'apikey': ADMIN_SB_KEY, 'Authorization': `Bearer ${ADMIN_SB_KEY}` } }
    );
    const profiles = await profileRes.json();
    if (!profiles || !profiles[0] || profiles[0].role !== 'super_admin') {
      return res.status(403).json({ error: 'Sin permisos de administrador' });
    }
    req.adminUser = userData;
    next();
  } catch (err) {
    console.error('[ADMIN AUTH ERROR]', err);
    return res.status(500).json({ error: 'Error verificando permisos' });
  }
};

const adminHeaders = {
  'apikey': ADMIN_SB_KEY,
  'Authorization': `Bearer ${ADMIN_SB_KEY}`,
  'Content-Type': 'application/json'
};

// GET /admin/stats — Resumen del dashboard
app.get('/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const [profilesRes, viajesRes, gastosRes, partRes] = await Promise.all([
      fetch(`${ADMIN_SB_URL}/rest/v1/profiles?select=*&order=created_at.desc`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/viajes?select=*&order=created_at.desc`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/gastos?select=monto,viaje_id`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/participantes?select=viaje_id,aporte`, { headers: adminHeaders })
    ]);

    const profiles = await profilesRes.json();
    const viajes = await viajesRes.json();
    const gastos = await gastosRes.json();
    const participantes = await partRes.json();

    const safeProfiles = Array.isArray(profiles) ? profiles : [];
    const safeViajes = Array.isArray(viajes) ? viajes : [];
    const safeGastos = Array.isArray(gastos) ? gastos : [];
    const safePart = Array.isArray(participantes) ? participantes : [];

    const totalBudget = safeViajes.reduce((a, v) => a + (Number(v.presupuesto) || 0), 0)
      + safePart.reduce((a, p) => a + (Number(p.aporte) || 0), 0);
    const totalExpenses = safeGastos.reduce((a, g) => a + (Number(g.monto) || 0), 0);

    return res.status(200).json({
      totalUsers: safeProfiles.length,
      totalTrips: safeViajes.length,
      totalBudget,
      totalExpenses,
      recentUsers: safeProfiles.slice(0, 5),
      recentTrips: safeViajes.slice(0, 5)
    });
  } catch (err) {
    console.error('[ADMIN STATS ERROR]', err);
    return res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /admin/users — Listar todos los usuarios con su perfil
app.get('/admin/users', verifyAdmin, async (req, res) => {
  try {
    const [usersRes, profilesRes] = await Promise.all([
      fetch(`${ADMIN_SB_URL}/auth/v1/admin/users`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/profiles?select=*`, { headers: adminHeaders })
    ]);

    const usersData = await usersRes.json();
    const profiles = await profilesRes.json();

    const profileMap = new Map();
    if (Array.isArray(profiles)) profiles.forEach(p => profileMap.set(p.id, p));

    const mergedUsers = (usersData.users || []).map(u => {
      const profile = profileMap.get(u.id) || {};
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        nombre: u.user_metadata?.nombre || profile.nombre || '',
        apellido: u.user_metadata?.apellido || profile.apellido || '',
        telefono: u.user_metadata?.telefono || profile.telefono || '',
        codigo_pais: u.user_metadata?.codigo_pais || profile.codigo_pais || '',
        identificacion: u.user_metadata?.identificacion || profile.identificacion || '',
        role: profile.role || 'usuario'
      };
    });

    return res.status(200).json({ users: mergedUsers });
  } catch (err) {
    console.error('[ADMIN USERS ERROR]', err);
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// POST /admin/update-role — Cambiar rol de un usuario
app.post('/admin/update-role', verifyAdmin, async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    if (!userId || !newRole) return res.status(400).json({ error: 'Faltan userId o newRole' });

    const validRoles = ['usuario', 'conductor', 'super_admin', 'Individual', 'Grupal'];
    if (!validRoles.includes(newRole)) return res.status(400).json({ error: 'Rol no válido' });

    const updateRes = await fetch(
      `${ADMIN_SB_URL}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: { ...adminHeaders, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ role: newRole })
      }
    );

    if (updateRes.ok) {
      console.log(`[ADMIN] Rol de ${userId} cambiado a ${newRole}`);
      return res.status(200).json({ status: 'success' });
    } else {
      console.error('[ADMIN ROLE UPDATE]', await updateRes.text());
      return res.status(500).json({ error: 'No se pudo actualizar el rol' });
    }
  } catch (err) {
    console.error('[ADMIN ROLE ERROR]', err);
    return res.status(500).json({ error: 'Error interno al actualizar rol' });
  }
});

// GET /admin/trips — Todos los viajes con datos enriquecidos
app.get('/admin/trips', verifyAdmin, async (req, res) => {
  try {
    const [viajesRes, profilesRes, gastosRes, partRes] = await Promise.all([
      fetch(`${ADMIN_SB_URL}/rest/v1/viajes?select=*&order=created_at.desc`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/profiles?select=id,nombre,apellido`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/gastos?select=viaje_id,monto`, { headers: adminHeaders }),
      fetch(`${ADMIN_SB_URL}/rest/v1/participantes?select=viaje_id`, { headers: adminHeaders })
    ]);

    const viajes = await viajesRes.json();
    const profiles = await profilesRes.json();
    const gastos = await gastosRes.json();
    const participantes = await partRes.json();

    const profileMap = new Map();
    if (Array.isArray(profiles)) profiles.forEach(p => profileMap.set(p.id, p));

    const expensesByTrip = new Map();
    if (Array.isArray(gastos)) gastos.forEach(g => {
      expensesByTrip.set(g.viaje_id, (expensesByTrip.get(g.viaje_id) || 0) + Number(g.monto));
    });

    const participantsByTrip = new Map();
    if (Array.isArray(participantes)) participantes.forEach(p => {
      participantsByTrip.set(p.viaje_id, (participantsByTrip.get(p.viaje_id) || 0) + 1);
    });

    const enrichedTrips = (Array.isArray(viajes) ? viajes : []).map(v => {
      const creator = profileMap.get(v.user_id);
      return {
        ...v,
        creator_name: creator ? `${creator.nombre || ''} ${creator.apellido || ''}`.trim() : 'Desconocido',
        totalExpenses: expensesByTrip.get(v.id) || 0,
        participantsCount: participantsByTrip.get(v.id) || 0
      };
    });

    return res.status(200).json({ trips: enrichedTrips });
  } catch (err) {
    console.error('[ADMIN TRIPS ERROR]', err);
    return res.status(500).json({ error: 'Error al listar viajes' });
  }
});

// GET /admin/system-health — Estado de conexiones
app.get('/admin/system-health', verifyAdmin, async (req, res) => {
  const results = {
    otpServer: { status: 'online', timestamp: new Date().toISOString() },
    supabase: { status: 'checking' },
    evolutionApi: { status: 'checking' }
  };

  try {
    const sbRes = await fetch(`${ADMIN_SB_URL}/rest/v1/profiles?select=id&limit=1`, {
      headers: { 'apikey': ADMIN_SB_KEY, 'Authorization': `Bearer ${ADMIN_SB_KEY}` }
    });
    results.supabase = { status: sbRes.ok ? 'online' : 'error', code: sbRes.status, timestamp: new Date().toISOString() };
  } catch (e) {
    results.supabase = { status: 'offline', timestamp: new Date().toISOString() };
  }

  try {
    const evBaseUrl = EVOLUTION_URL.replace('/message/sendText/ViajeJusto', '');
    const evRes = await fetch(evBaseUrl, { headers: { 'apikey': EVOLUTION_API_KEY } });
    results.evolutionApi = { status: (evRes.ok || evRes.status < 500) ? 'online' : 'error', code: evRes.status, timestamp: new Date().toISOString() };
  } catch (e) {
    results.evolutionApi = { status: 'offline', timestamp: new Date().toISOString() };
  }

  return res.status(200).json(results);
});

// DELETE /admin/users/:id — Eliminar usuario (Auth + tabla + datos en cascada)
app.delete('/admin/users/:id', verifyAdmin, async (req, res) => {
  const { id: userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'ID de usuario requerido' });

  try {
    // 1. Obtener IDs de viajes del usuario para eliminar datos relacionados
    const viajesRes = await fetch(
      `${ADMIN_SB_URL}/rest/v1/viajes?user_id=eq.${userId}&select=id`,
      { headers: adminHeaders }
    );
    const viajes = viajesRes.ok ? await viajesRes.json() : [];
    const viajeIds = viajes.map(v => v.id);

    // 2. Eliminar gastos de sus viajes
    if (viajeIds.length > 0) {
      await fetch(
        `${ADMIN_SB_URL}/rest/v1/gastos?viaje_id=in.(${viajeIds.join(',')})`,
        { method: 'DELETE', headers: adminHeaders }
      );
      // 3. Eliminar participantes de sus viajes
      await fetch(
        `${ADMIN_SB_URL}/rest/v1/participantes?viaje_id=in.(${viajeIds.join(',')})`,
        { method: 'DELETE', headers: adminHeaders }
      );
    }

    // 4. Eliminar viajes del usuario
    await fetch(
      `${ADMIN_SB_URL}/rest/v1/viajes?user_id=eq.${userId}`,
      { method: 'DELETE', headers: adminHeaders }
    );

    // 5. Eliminar participaciones del usuario en viajes ajenos
    await fetch(
      `${ADMIN_SB_URL}/rest/v1/participantes?user_id=eq.${userId}`,
      { method: 'DELETE', headers: adminHeaders }
    );

    // 6. Eliminar perfil de la tabla usuarios/profiles
    await fetch(
      `${ADMIN_SB_URL}/rest/v1/usuarios?id=eq.${userId}`,
      { method: 'DELETE', headers: adminHeaders }
    );
    // También intentar en tabla profiles por si existe
    await fetch(
      `${ADMIN_SB_URL}/rest/v1/profiles?id=eq.${userId}`,
      { method: 'DELETE', headers: adminHeaders }
    );

    // 7. Eliminar de Supabase Auth (invalida email + sesiones)
    const authDelRes = await fetch(
      `${ADMIN_SB_URL}/auth/v1/admin/users/${userId}`,
      { method: 'DELETE', headers: { 'apikey': ADMIN_SB_KEY, 'Authorization': `Bearer ${ADMIN_SB_KEY}` } }
    );

    if (!authDelRes.ok && authDelRes.status !== 404) {
      const errBody = await authDelRes.text();
      console.error('[DELETE USER AUTH]', authDelRes.status, errBody);
      return res.status(500).json({ error: `Error al eliminar auth: ${errBody}` });
    }

    console.log(`[ADMIN] Usuario ${userId} eliminado completamente.`);
    return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });

  } catch (err) {
    console.error('[DELETE USER ERROR]', err);
    return res.status(500).json({ error: err.message || 'Error al eliminar usuario' });
  }
});

// AÑADIDO: Webhook para Tools de Agente DO
const SUPABASE_URL = "https://supabase.viaje-justo.xyz";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

// Tool: Crear Viaje
app.post('/bot/tools/create-trip', async (req, res) => {
    try {
        const { pais, ciudad, fecha, cantidad_personas, moneda_codigo, user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: "Falta identificador del coordinador (user_id)" });
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/viajes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                pais, ciudad, fecha, cantidad_personas, moneda_codigo, 
                usuario_id: user_id, 
                estado: 'activo'
            })
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return res.status(200).json({ success: true, message: "Viaje creado exitosamente en la base de datos", data });
    } catch (e) {
        console.error("Tool create-trip error", e);
        return res.status(500).json({ error: e.message });
    }
});

// Tool: Actualizar Invitado
app.post('/bot/tools/update-guest', async (req, res) => {
    try {
        const { participante_id, nombre, aporte } = req.body;
        if (!participante_id) return res.status(400).json({ error: "Falta identificador del invitado (participante_id)" });

        const bodyToUpdate = {};
        if (nombre) bodyToUpdate.nombre = nombre;
        if (aporte !== undefined) bodyToUpdate.aporte = parseFloat(aporte);

        const response = await fetch(`${SUPABASE_URL}/rest/v1/participantes?id=eq.${participante_id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(bodyToUpdate)
        });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        return res.status(200).json({ success: true, message: "Invitado actualizado correctamente en la base de datos", data });
    } catch (e) {
        console.error("Tool update-guest error", e);
        return res.status(500).json({ error: e.message });
    }
});


// AÑADIDO: Puente para DigitalOcean Agent
const agentMemory = new Map();
const DO_AGENT_URL = "https://k2toijdhaywnx3k3uzzvxchw.agents.do-ai.run/api/v1/chat/completions";
const DO_AGENT_KEY = "PGL8OHYfQie_cftLbbp5CfyIo5dhQYl4";

app.post('/bot/chat', async (req, res) => {
    try {
        const { phone, text, contextString } = req.body;
        if (!phone || !text) return res.status(400).json({ error: "Faltan datos" });

        // Recuperar memoria y datos del usuario almacenados
        if (!agentMemory.has(phone)) {
            agentMemory.set(phone, { history: [], context: null });
        }
        const session = agentMemory.get(phone);

        // Cachear el context del usuario solo cuando cambia (evita tokens repetidos)
        if (contextString && session.context !== contextString) {
            session.context = contextString;
        }

        // Mantener solo los últimos 10 turnos (20 mensajes = 10 user + 10 assistant)
        if (session.history.length > 20) {
            session.history = session.history.slice(session.history.length - 20);
        }

        // Agregar mensaje del usuario (sin repetir contexto en cada mensaje)
        session.history.push({ role: "user", content: text });

        // Construir payload: system message con contexto + historial compacto
        const messages = [];
        if (session.context) {
            messages.push({ role: "system", content: `Datos del usuario en sesión:\n${session.context}` });
        }
        messages.push(...session.history);

        // Llamar a DO con timeout de 8s
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(DO_AGENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DO_AGENT_KEY}`
            },
            body: JSON.stringify({ messages }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error("Fallo DO Agent: " + await response.text());
        const data = await response.json();

        let reply = data.choices[0].message.content || "";
        // Limpiar el tag de pensamiento de DeepSeek R1
        reply = reply.replace(/<think>[\s\S]*?<\/think>\n?/g, '').trim();

        // Guardar respuesta en historial (sin el contexto, solo el intercambio)
        session.history.push({ role: "assistant", content: reply });
        agentMemory.set(phone, session);

        res.status(200).json({ output: reply });
    } catch (e) {
        if (e.name === 'AbortError') {
            console.error("Chat timeout", e);
            return res.status(200).json({ output: "⏱️ La consulta tardó demasiado. ¿Me la repites, por favor?" });
        }
        console.error("Chat error", e);
        res.status(500).json({ output: "¡Ay! Tuve un problema de red consultando tu información. ¿Me lo repites en un ratito? 🙏" });
    }
});

// Catch-all: enviar index.html para rutas del SPA (Vue Router)
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor Independiente SMS/Email cargado en puerto ${PORT}`);
});
