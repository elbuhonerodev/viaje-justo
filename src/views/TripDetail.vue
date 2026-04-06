<template>
  <div class="trip-detail-container fade-in">
    <!-- Navegación y Cabecera Superior -->
    <header class="trip-header elevate-1">
      <div class="header-content">
        <button @click="volverDashboard" class="md-btn btn-back">⬅ Volver</button>
        <div class="trip-title-area" v-if="viaje">
          <h2>Viaje a {{ viaje.pais }}</h2>
          <span class="trip-date">📅 {{ viaje.fecha }} <span v-if="isAdmin" class="role-badge">👑 Administrador</span></span>
        </div>
      </div>
      
      <!-- Esquina Superior: Widgets Presupuesto Global en Tiempo Real -->
      <div class="budget-corner" v-if="viaje">
        <div class="budget-stat">
          <span class="stat-label">Fondo Total</span>
          <span class="stat-value">💵 {{ presupuestoTotal.toFixed(2) }} {{ viaje.moneda_codigo }}</span>
        </div>
        <div class="budget-stat">
          <span class="stat-label">Gastado</span>
          <span class="stat-value text-error">💸 {{ gastosTotal.toFixed(2) }} {{ viaje.moneda_codigo }}</span>
        </div>
        <div class="budget-stat highlight-stat">
          <span class="stat-label">Saldo Disponible</span>
          <span class="stat-value" :class="{'text-error': saldoActual < 0, 'text-success': saldoActual >= 0}">
            💰 {{ saldoActual.toFixed(2) }} {{ viaje.moneda_codigo }}
          </span>
        </div>
      </div>
    </header>

    <!-- Barra de Navegación Interna -->
    <nav class="local-nav-bar">
      <button :class="['tab-btn', { active: activeTab === 'destino' }]" @click="activeTab = 'destino'">📍 Lugar de Destino</button>
      <button v-if="!(authStore.role === 'Individual' && isAdmin)" :class="['tab-btn', { active: activeTab === 'participantes' }]" @click="activeTab = 'participantes'">👥 Participantes</button>
      <button :class="['tab-btn', { active: activeTab === 'gastos' }]" @click="activeTab = 'gastos'">💳 Gastos Realizados</button>
    </nav>

    <!-- Contenido Dinámico según pestaña -->
    <main class="trip-content">
      
      <div v-if="loadingGlobal" class="loading-state">
        Cargando datos del viaje...
      </div>
      <div v-else-if="!viaje" class="error-state">
        No se pudo encontrar el viaje.
      </div>

      <template v-else>
        <!-- TAB 1: DESTINO (INFO ACTUAL) -->
        <section v-if="activeTab === 'destino'" class="tab-pane fade-in">
          <div class="md-card elevate-1 detail-card">
            <h3 class="title">Información Principal del Destino</h3>
            <div class="info-grid">
              <div class="info-item">
                <label>📍 País de destino:</label>
                <span>{{ viaje.pais }}</span>
              </div>
              <div class="info-item" v-if="viaje.motivo_viaje">
                <label>📌 Motivo principal:</label>
                <span>{{ viaje.motivo_viaje }}</span>
              </div>
              <div class="info-item" v-if="viaje.alojamiento">
                <label>🏨 Alojamiento:</label>
                <span>{{ viaje.alojamiento }}</span>
              </div>
              <div class="info-item" v-if="viaje.modo_viaje">
                <label>🚌 Transporte Primario:</label>
                <span>{{ viaje.modo_viaje }}</span>
              </div>
              <div class="info-item">
                <label>📅 Fecha planificada:</label>
                <span>{{ viaje.fecha }}</span>
              </div>
              <div class="info-item">
                <label>👥 Personas planificadas:</label>
                <span>{{ viaje.cantidad_personas }}</span>
              </div>
              <div class="info-item">
                <label>💵 Moneda base:</label>
                <span>{{ viaje.moneda_codigo }}</span>
              </div>
              <div class="info-item">
                <label>💰 Presupuesto Inicial del Viaje:</label>
                <span>{{ viaje.presupuesto ? viaje.presupuesto.toFixed(2) : 'No definido' }}</span>
              </div>
            </div>

            <!-- Botón de invitar: solo al dueño (isAdmin) con rol Grupal -->
            <div v-if="isAdmin && authStore.role !== 'Individual'" class="invite-section">
              <p class="invite-text">¡Invita a tus amigos para que colaboren y se unan al grupo!</p>
              <button @click="copiarLink" class="md-btn btn-primary full-w">
                {{ linkCopiado ? '✅ Copiado al Portapapeles' : '🔗 Copiar Link de Invitación' }}
              </button>
            </div>
            <!-- Participante invitado: solo lectura -->
            <div v-else-if="!isAdmin" class="invite-section">
              <p class="invite-text">Estás unido a este viaje en modo <strong>Solo Lectura</strong>. Puedes visualizar los avances y ver quiénes participan en tiempo real.</p>
            </div>
            <!-- Admin Individual: sin link de invitación -->
            <div v-else class="invite-section">
              <p class="invite-text">Este es tu viaje personal. Registra tus gastos en las pestañas de arriba.</p>
            </div>
          </div>
        </section>

        <!-- TAB 2: PARTICIPANTES -->
        <section v-if="activeTab === 'participantes'" class="tab-pane fade-in crud-layout">
          <!-- Formulario Especial para Participantes Ocultado (Read-only por requerimiento) -->
          <!-- Los invitados son de solo lectura y no pueden añadir o editar el aporte desde aquí -->
          <!-- Formulario Participantes (Solo Admin) -->
          <div class="md-card elevate-1 form-card" v-if="isAdmin">
            <h3 class="title">Añadir Participante Físico</h3>
            <p style="font-size: 14px; margin-bottom: 20px; color: var(--md-sys-color-outline);">
              *Recomendación: Envíales el Link de Invitación para que ellos administren su propia cuenta aporten gastos directamente. Úsalo solo para añadir gente que no usará el sistema web.
            </p>
            <form @submit.prevent="guardarParticipante" class="flex-form">
              <div class="md-input-group">
                <input id="p_nombre" type="text" v-model="formParticipante.nombre" required class="md-input" placeholder=" " />
                <label for="p_nombre" class="md-label">Nombre del participante</label>
              </div>
              <div class="md-input-group">
                <input id="p_aporte" type="number" step="0.01" min="0" v-model="formParticipante.aporte" required class="md-input" placeholder=" " />
                <label for="p_aporte" class="md-label">Presupuesto a aportar ({{ viaje.moneda_codigo }})</label>
              </div>
              <button type="submit" :disabled="loadingAccion" class="md-btn btn-primary">
                {{ loadingAccion ? 'Añadiendo...' : '+ Añadir Amigo' }}
              </button>
            </form>
          </div>

          <!-- Lista Participantes -->
          <div class="md-card elevate-1 list-card">
            <h3 class="title">Integrantes del Viaje</h3>
            <div v-if="participantes.length === 0" class="empty-state">No hay participantes adicionales.</div>
            <ul v-else class="simple-list">
              <li v-for="part in participantes" :key="part.id" class="list-item">
                <div class="item-info">
                  <strong>{{ part.nombre }} <span v-if="part.user_id === authStore.user?.id" class="self-badge">(Tú)</span></strong>
                  <span class="detail-badge">Aporta: {{ Number(part.aporte).toFixed(2) }} {{ viaje.moneda_codigo }}</span>
                </div>
                <button v-if="isAdmin" @click="eliminarParticipante(part.id)" class="action-btn delete-btn" title="Quitar">❌</button>
              </li>
            </ul>
          </div>
        </section>

        <!-- TAB 3: GASTOS REALIZADOS -->
        <section v-if="activeTab === 'gastos'" class="tab-pane fade-in crud-layout">
           <!-- Formulario Gastos (Bloqueado a Solo Administrador) -->
           <div class="md-card elevate-1 form-card" v-if="isAdmin">
            <h3 class="title">Registrar Gasto</h3>

            <!-- Escáner IA: QR y Código de Barras -->
            <div class="scanner-box" :class="{ scanning: scannerActivo }">
              <p class="scanner-label">🤖 Escaneo Automático con IA</p>
              <p class="scanner-hint">Sube una foto del recibo, QR o código de barras y la IA rellenará el formulario.</p>
              <label class="scanner-btn" :class="{ 'loading-scanner': escanLoading }">
                <span v-if="escanLoading">⏳ Analizando imagen...</span>
                <span v-else>📷 Escanear QR / Código de Barras</span>
                <input type="file" accept="image/*" class="scanner-file-input" @change="escanearConIA" :disabled="escanLoading" />
              </label>
              <div v-if="escanResultado" class="scan-result" :class="escanResultado.ok ? 'scan-ok' : 'scan-error'">
                {{ escanResultado.mensaje }}
              </div>
            </div>

            <form @submit.prevent="guardarGasto" class="flex-form">
              <div class="md-input-group">
                <input id="g_concepto" type="text" v-model="formGasto.concepto" required class="md-input" placeholder=" " />
                <label for="g_concepto" class="md-label">Motivo del gasto (ej. Cena, Taxi)</label>
              </div>
              
              <div class="md-input-group">
                <select id="g_categoria" v-model="formGasto.categoria" required class="md-input">
                  <option value="" disabled hidden></option>
                  <option value="🏨 Hotel">🏨 Hotel / Alojamiento</option>
                  <option value="🍔 Comida">🍔 Comida / Restaurante</option>
                  <option value="✈️ Transporte">✈️ Transporte / Vuelos</option>
                  <option value="🎟️ Entretenimiento">🎟️ Tours / Entradas</option>
                  <option value="🛒 Otros">🛒 Otros / Imprevistos</option>
                </select>
                <label for="g_categoria" class="md-label">Categoría</label>
              </div>

              <div class="md-input-group">
                <input id="g_monto" type="number" step="0.01" min="0" v-model="formGasto.monto" required class="md-input" placeholder=" " />
                <label for="g_monto" class="md-label">Monto gastado ({{ viaje.moneda_codigo }})</label>
              </div>

              <div class="file-uploader">
                <label class="file-label">Soporte fotográfico (Opcional):</label>
                <input type="file" @change="handleFileChange" accept="image/*" class="file-input" />
              </div>

              <button type="submit" :disabled="loadingAccion" class="md-btn btn-primary error-bg">
                <span v-if="loadingAccion && archivoFoto">Subiendo foto y guardando...</span>
                <span v-else-if="loadingAccion">Registrando...</span>
                <span v-else>💳 Descontar del Presupuesto</span>
              </button>
            </form>
          </div>

          <!-- Lista Gastos -->
          <div class="md-card elevate-1 list-card">
            <h3 class="title">Historial de Salidas</h3>
            <div v-if="gastos.length === 0" class="empty-state">No hay ningún gasto todavía.</div>
            <ul v-else class="simple-list">
              <li v-for="gasto in gastos" :key="gasto.id" class="list-item expense-item">
                <div class="expense-body">
                  <div class="item-info">
                    <div class="expense-header">
                      <span class="cat-badge">{{ gasto.categoria }}</span>
                      <strong>{{ gasto.concepto }}</strong>
                    </div>
                    <span class="expense-amount">- {{ Number(gasto.monto).toFixed(2) }} {{ viaje.moneda_codigo }}</span>
                  </div>
                  <div v-if="gasto.evidencia_url" class="expense-evidence">
                    <a :href="gasto.evidencia_url" target="_blank" title="Ver Recibo Completo" class="evidence-link">
                      <img :src="gasto.evidencia_url" class="evidence-thumbnail" alt="Imagen del recibo" />
                    </a>
                  </div>
                </div>
                <button v-if="isAdmin || gasto.user_id === authStore.user?.id" @click="eliminarGasto(gasto.id)" class="action-btn delete-btn" title="Eliminar recibo">🗑️</button>
              </li>
            </ul>
          </div>
        </section>
      </template>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref<'destino' | 'participantes' | 'gastos'>('destino');
const linkCopiado = ref(false);

interface Viaje {
  id: string;
  user_id: string;
  pais: string;
  fecha: string;
  cantidad_personas: number;
  moneda_codigo: string;
  presupuesto: number | null;
  motivo_viaje?: string;
  alojamiento?: string;
  modo_viaje?: string;
}

interface Participante {
  id: string;
  viaje_id: string;
  user_id?: string;
  nombre: string;
  aporte: number;
}

interface Gasto {
  id: string;
  viaje_id: string;
  user_id?: string;
  categoria: string;
  concepto: string;
  monto: number;
  evidencia_url?: string;
}

const viaje = ref<Viaje | null>(null);
const participantes = ref<Participante[]>([]);
const gastos = ref<Gasto[]>([]);
const loadingGlobal = ref(true);
const loadingAccion = ref(false);
const escanLoading = ref(false);
const scannerActivo = ref(false);
const escanResultado = ref<{ ok: boolean; mensaje: string } | null>(null);

const AI_AGENT_URL = 'https://aud-qr.viaje-justo.xyz';

const formParticipante = ref({ nombre: '', aporte: 0 });
const formGasto = ref({ concepto: '', categoria: '', monto: 0 });
const archivoFoto = ref<File | null>(null);

const miNuevoAporte = ref(0);

const isAdmin = computed(() => {
  return viaje.value?.user_id === authStore.user?.id;
});

const miParticipacion = computed(() => {
  return participantes.value.find(p => p.user_id === authStore.user?.id);
});

const presupuestoTotal = computed(() => {
  const base = viaje.value?.presupuesto || 0;
  const aportes = participantes.value.reduce((acc, p) => acc + Number(p.aporte), 0);
  return base + aportes;
});

const gastosTotal = computed(() => {
  return gastos.value.reduce((acc, g) => acc + Number(g.monto), 0);
});

const saldoActual = computed(() => {
  return presupuestoTotal.value - gastosTotal.value;
});

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    archivoFoto.value = target.files[0];
  } else {
    archivoFoto.value = null;
  }
};

const escanearConIA = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];

  escanLoading.value = true;
  scannerActivo.value = true;
  escanResultado.value = null;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${AI_AGENT_URL}/vision/scan-qr`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Error de red al conectar con el agente IA');
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const raw = data.results[0].data as string;
      // Intentar extraer monto con regex (ej. "Total: 45000" o "$45,000")
      const montoMatch = raw.match(/(?:total|monto|valor|price|amount|\$)?[:\s]*([\d][\d.,]+)/i);
      if (montoMatch) {
        const parsed = parseFloat(montoMatch[1].replace(/,/g, ''));
        if (!isNaN(parsed)) formGasto.value.monto = parsed;
      }
      // Usar el texto raw como concepto si está vacío
      if (!formGasto.value.concepto) {
        formGasto.value.concepto = raw.substring(0, 80);
      }
      escanResultado.value = { ok: true, mensaje: `✅ Escaneado: "${raw.substring(0, 60)}${raw.length > 60 ? '...' : ''}"` };
    } else {
      escanResultado.value = { ok: false, mensaje: '⚠️ No se detectó ningún QR o código de barras. Ingresa los datos manualmente.' };
    }
  } catch (err: any) {
    escanResultado.value = { ok: false, mensaje: '❌ Error al conectar con el agente IA: ' + err.message };
  } finally {
    escanLoading.value = false;
    // Reset input
    target.value = '';
  }
};

const copiarLink = () => {
  const link = `${window.location.origin}/join/${viaje.value?.id}`;
  navigator.clipboard.writeText(link).then(() => {
    linkCopiado.value = true;
    setTimeout(() => { linkCopiado.value = false; }, 3000);
  });
};

const loadDashboard = async () => {
  const tripId = route.params.id as string;
  loadingGlobal.value = true;
  
  try {
    const { data: vData, error: vErr } = await supabase
      .from('viajes').select('*').eq('id', tripId).single();
    if (vErr) throw vErr;
    viaje.value = vData as Viaje;

    const { data: pData } = await supabase
      .from('participantes').select('*').eq('viaje_id', tripId).order('created_at', { ascending: true });
    if (pData) participantes.value = pData as Participante[];
    
    // Set default value for user update form
    if (miParticipacion.value) {
      miNuevoAporte.value = miParticipacion.value.aporte;
    }

    const { data: gData } = await supabase
      .from('gastos').select('*').eq('viaje_id', tripId).order('created_at', { ascending: false });
    if (gData) gastos.value = gData as Gasto[];

  } catch (err: any) {
    console.error("Error al cargar sala:", err);
  } finally {
    loadingGlobal.value = false;
  }
}

const loadParticipantesOnly = async () => {
    const tripId = route.params.id as string;
    const { data: pData } = await supabase
      .from('participantes').select('*').eq('viaje_id', tripId).order('created_at', { ascending: true });
    if (pData) participantes.value = pData as Participante[];
};

let realtimeChannel: any;

onMounted(() => {
  loadDashboard();
  
  // Realtime Sync Subscription
  const tripId = route.params.id as string;
  realtimeChannel = supabase.channel(`public:participantes:viaje_id=eq.${tripId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes', filter: `viaje_id=eq.${tripId}` }, () => {
       loadParticipantesOnly();
    })
    .subscribe();
});

import { onUnmounted } from 'vue';

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
});


const guardarParticipante = async () => {
  if (!viaje.value) return;
  loadingAccion.value = true;
  try {
    const nuevo = {
      viaje_id: viaje.value.id,
      nombre: formParticipante.value.nombre,
      aporte: Number(formParticipante.value.aporte) || 0
    };
    
    const { data, error } = await supabase.from('participantes').insert([nuevo]).select();
    if (error) throw error;
    if (data && data.length > 0) {
      participantes.value.push(data[0] as Participante);
      formParticipante.value = { nombre: '', aporte: 0 };
    } else {
      throw new Error("No se devolvió el participante guardado");
    }
  } catch (err: any) {
    alert("Error interno: " + err.message);
  } finally {
    loadingAccion.value = false;
  }
};

const eliminarParticipante = async (id: string) => {
  const { error } = await supabase.from('participantes').delete().eq('id', id);
  if (!error) {
    participantes.value = participantes.value.filter(p => p.id !== id);
  } else {
    alert("Error al eliminar: " + error.message);
  }
};

const guardarGasto = async () => {
  if (!viaje.value) return;
  loadingAccion.value = true;
  try {
    let evidencia_url = null;
    
    if (archivoFoto.value) {
      const ext = archivoFoto.value.name.split('.').pop() || 'jpg';
      const fileName = `${viaje.value.id}/${Date.now()}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage.from('recibos').upload(fileName, archivoFoto.value);
      if (uploadErr) throw new Error("Error al subir foto (verifique su bucket Storage SQL): " + uploadErr.message);
      
      const { data } = supabase.storage.from('recibos').getPublicUrl(fileName);
      evidencia_url = data.publicUrl;
    }

    const nuevo = {
      viaje_id: viaje.value.id,
      user_id: authStore.user?.id,
      concepto: formGasto.value.concepto,
      categoria: formGasto.value.categoria,
      monto: Number(formGasto.value.monto) || 0,
      evidencia_url: evidencia_url
    };
    
    const { data: insertData, error } = await supabase.from('gastos').insert([nuevo]).select();
    if (error) throw error;
    if (insertData && insertData.length > 0) {
      gastos.value.unshift(insertData[0] as Gasto);
      formGasto.value = { concepto: '', categoria: '', monto: 0 };
      archivoFoto.value = null; 
      // Reset input DOM if possible
      const finput = document.querySelector('.file-input') as HTMLInputElement;
      if (finput) finput.value = "";
    } else {
      throw new Error("El gasto se guardó pero no pudo ser leído por permisos RLS.");
    }
  } catch (err: any) {
    alert("Ocurrió un error al registrar gasto. (¿Ejecutaste el SQL requerido?): " + err.message);
  } finally {
    loadingAccion.value = false;
  }
};

const eliminarGasto = async (id: string) => {
  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (!error) {
    gastos.value = gastos.value.filter(g => g.id !== id);
  } else {
    alert("Error al eliminar gasto: " + error.message);
  }
};

const volverDashboard = () => {
  router.push('/dashboard-user');
};

</script>

<style scoped>
.trip-detail-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-background);
}

.fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.trip-header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
  padding: 20px 40px; background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface); box-shadow: var(--shadow-2);
  position: sticky; top: 0; z-index: 10;
}

.header-content { display: flex; align-items: center; gap: 20px; }

.btn-back { background-color: transparent; color: var(--md-sys-color-primary); border: 1px solid var(--md-sys-color-primary); }
.btn-back:hover { background-color: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }

.trip-title-area h2 { margin: 0; font-size: 24px; color: var(--md-sys-color-primary); }
.trip-date { font-size: 14px; color: var(--md-sys-color-outline); display: flex; align-items: center; gap: 8px;}
.role-badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;}

.budget-corner {
  display: flex; gap: 16px; background-color: var(--md-sys-color-surface-container);
  padding: 12px 24px; border-radius: 12px;
}
.budget-stat {
  display: flex; flex-direction: column; align-items: flex-end;
  border-right: 1px solid var(--md-sys-color-outline-variant); padding-right: 16px;
}
.budget-stat:last-child { border-right: none; padding-right: 0; }
.stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--md-sys-color-outline); }
.stat-value { font-size: 18px; font-weight: 700; }
.highlight-stat .stat-value { font-size: 22px; }

.text-success { color: #10b981; }
.text-error { color: #ef4444; }
.error-bg { background-color: #ef4444 !important; color: white !important; }

.local-nav-bar {
  display: flex; justify-content: center; gap: 8px; padding: 16px;
  background-color: var(--md-sys-color-surface-container-low);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
}
.tab-btn {
  padding: 12px 24px; background: transparent; border: none; border-bottom: 3px solid transparent;
  color: var(--md-sys-color-on-surface-variant); font-weight: 600; font-size: 16px; cursor: pointer; transition: all 0.2s ease;
}
.tab-btn:hover { background-color: var(--md-sys-color-surface-container); color: var(--md-sys-color-on-surface); }
.tab-btn.active { color: var(--md-sys-color-primary); border-bottom-color: var(--md-sys-color-primary); background-color: var(--md-sys-color-surface-container-high); }

.trip-content { padding: 40px; display: flex; justify-content: center; }

.md-card { background-color: var(--md-sys-color-surface); border-radius: 20px; padding: 32px; box-shadow: var(--shadow-1); }
.title { font-size: 20px; color: var(--md-sys-color-primary); margin-top: 0; margin-bottom: 24px; }

.detail-card { max-width: 600px; width: 100%; }
.info-grid { display: grid; gap: 16px; }
.info-item { display: flex; justify-content: space-between; border-bottom: 1px solid var(--md-sys-color-surface-container); padding-bottom: 8px; }
.info-item label { color: var(--md-sys-color-outline); font-weight: 500; }
.info-item span { font-weight: 600; color: var(--md-sys-color-on-surface); }

.invite-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--md-sys-color-surface-container); text-align: center;}
.invite-text { color: var(--md-sys-color-outline); margin-bottom: 16px; font-size: 15px; }

.crud-layout { display: flex; flex-wrap: wrap; gap: 32px; width: 100%; max-width: 1200px; align-items: flex-start; }
.form-card { flex: 1; min-width: 320px; }
.list-card { flex: 1.5; min-width: 350px; }
.flex-form { display: flex; flex-direction: column; gap: 20px; }

.simple-list { list-style: none; padding: 0; display: grid; gap: 12px; }
.list-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background-color: var(--md-sys-color-surface-container); border-radius: 12px; }
.item-info { display: flex; flex-direction: column; gap: 4px; }
.self-badge { color: #10b981; font-weight: bold; font-size: 13px; margin-left: 6px; }

.detail-badge {
  background-color: var(--md-sys-color-surface); padding: 4px 10px; border-radius: 12px;
  font-size: 12px; color: var(--md-sys-color-primary); border: 1px solid var(--md-sys-color-outline-variant);
  display: inline-block; width: max-content;
}
.action-btn { background: none; border: none; font-size: 20px; cursor: pointer; padding: 8px; border-radius: 50%; transition: background-color 0.2s; }
.action-btn:hover { background-color: var(--md-sys-color-surface); }

.expense-body { display: flex; width: 100%; justify-content: space-between; align-items: center; }
.expense-header { display: flex; align-items: center; gap: 8px; }
.cat-badge { font-size: 14px; }
.expense-amount { font-weight: 800; color: #ef4444; font-size: 18px; margin-top: 4px; }
.expense-evidence { background: var(--md-sys-color-surface); padding: 6px; border-radius: 8px; box-shadow: var(--shadow-1); margin-right: 16px; transition: transform 0.2s;}
.expense-evidence:hover { transform: scale(1.05); }
.evidence-thumbnail { width: 50px; height: 50px; object-fit: cover; border-radius: 6px; }

.file-uploader {
  display: flex; flex-direction: column; gap: 8px;
  padding: 16px; background: var(--md-sys-color-surface-container); border-radius: 8px;
  border: 1px dashed var(--md-sys-color-outline);
}
.file-label { color: var(--md-sys-color-on-surface); font-size: 14px; font-weight: bold; }
.file-input { font-size: 14px; }

.scanner-box {
  background: linear-gradient(135deg, var(--md-sys-color-surface-container) 0%, var(--md-sys-color-surface-container-high) 100%);
  border: 2px dashed var(--md-sys-color-outline-variant);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  transition: border-color 0.3s;
}
.scanner-box.scanning { border-color: var(--md-sys-color-primary); }
.scanner-label { font-size: 15px; font-weight: 700; color: var(--md-sys-color-primary); margin: 0 0 4px; }
.scanner-hint { font-size: 13px; color: var(--md-sys-color-outline); margin: 0 0 14px; }
.scanner-btn {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; width: 100%; padding: 12px;
  background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary);
  border-radius: 12px; font-weight: 600; font-size: 14px;
  cursor: pointer; transition: opacity 0.2s;
}
.scanner-btn:hover { opacity: 0.88; }
.scanner-btn.loading-scanner { opacity: 0.6; cursor: not-allowed; }
.scanner-file-input { display: none; }
.scan-result {
  margin-top: 12px; padding: 10px 14px; border-radius: 10px;
  font-size: 13px; font-weight: 500;
}
.scan-ok { background: #d1fae5; color: #065f46; }
.scan-error { background: #fee2e2; color: #991b1b; }

.full-w { width: 100%; }

select.md-input { appearance: none; }
.md-input:focus ~ .md-label, .md-input:valid ~ .md-label {
  transform: translateY(-8px) scale(0.75); color: var(--md-sys-color-primary);
}
@media (max-width: 768px) {
  .trip-header { flex-direction: column; align-items: stretch; gap: 16px; }
  .budget-corner { justify-content: space-between; }
}
</style>
