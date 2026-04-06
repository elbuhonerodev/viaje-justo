<template>
  <div class="dashboard-container fade-in">
    <header class="dashboard-header">
      <h2>Mi Panel de Viajes</h2>
      <button @click="logout" class="md-btn btn-logout">Cerrar Sesión</button>
    </header>
    
    <main class="dashboard-content">
      <!-- Profile Info -->
      <section class="md-card elevate-1 profile-section">
        <h3 class="title">Hola, {{ authStore.user?.email }}</h3>
        <p class="body-text">Gestiona tus próximos viajes desde este panel.</p>
        <div class="info-badge">
          Rol: <strong>{{ authStore.role }}</strong>
        </div>
      </section>

      <!-- Trips CRUD Form -->
      <section class="crud-layout">
        <div class="md-card elevate-2 form-card">
          <h3 class="title">{{ isEditing ? 'Editar Viaje' : 'Registrar Nuevo Viaje' }}</h3>
          <form @submit.prevent="saveViaje" class="trip-form">
            
            <div class="md-input-group custom-select-wrapper">
              <div 
                class="md-input custom-select" 
                @click="isCountryMenuOpen = !isCountryMenuOpen"
                tabindex="0"
                @blur="delayedCloseMenu"
              >
                <div v-if="form.pais" class="selected-country">
                  <img :src="getFlagSrcByName(form.pais)" class="flag-icon" />
                  <span>{{ form.pais }}</span>
                </div>
                <!-- Hack para el visual del input vacío flotante de Material -->
                <div v-else class="selected-country" style="opacity: 0">&nbsp;</div>
                <span class="dropdown-arrow" :class="{ 'arrow-up': isCountryMenuOpen }">▼</span>
              </div>
              
              <ul v-if="isCountryMenuOpen" class="custom-options-list elevate-3">
                <li 
                  v-for="country in latamCountries" 
                  :key="country.code" 
                  @click="selectCountry(country.name)"
                  class="custom-option"
                >
                  <img :src="`https://flagcdn.com/w20/${country.code}.png`" class="flag-icon" />
                  {{ country.name }}
                </li>
              </ul>
              <label :class="['md-label', form.pais ? 'active-label' : '']">País a viajar</label>
            </div>

            <div class="md-input-group">
              <input id="fecha" type="date" v-model="form.fecha" class="md-input" required placeholder=" " />
              <label for="fecha" class="md-label">Fecha de inicio</label>
            </div>

            <div class="md-input-group">
              <input id="cantidad_personas" type="number" v-model="form.cantidad_personas" min="1" class="md-input" required placeholder=" " />
              <label for="cantidad_personas" class="md-label">Máx. de personas participantes</label>
            </div>

            <div class="md-input-group">
              <select id="motivo_viaje" v-model="form.motivo_viaje" class="md-input" required>
                <option value="" disabled hidden></option>
                <option value="Turismo / Vacaciones">🏖️ Turismo / Vacaciones</option>
                <option value="Negocios / Trabajo">💼 Negocios / Trabajo</option>
                <option value="Evento / Concierto">🎟️ Evento / Concierto</option>
                <option value="Familia / Amigos">🫂 Familia / Amigos</option>
                <option value="Otro">❓ Otro</option>
              </select>
              <label for="motivo_viaje" class="md-label">Motivo de viaje</label>
            </div>

            <div class="form-row" style="display: flex; gap: 16px;">
              <div class="md-input-group" style="flex: 1;">
                <select id="alojamiento" v-model="form.alojamiento" class="md-input" required>
                  <option value="" disabled hidden></option>
                  <option value="Hotel / Resort">🏨 Hotel / Resort</option>
                  <option value="Hostal / Backpacker">🛏️ Hostal / Backpacker</option>
                  <option value="Airbnb / Apartamento">🏠 Airbnb / Apartamento</option>
                  <option value="Casa de Conocidos">🫂 Casa de Conocidos</option>
                  <option value="No Decidido">❓ Aún no lo decido</option>
                </select>
                <label for="alojamiento" class="md-label">Tipo de Alojamiento</label>
              </div>

              <div class="md-input-group" style="flex: 1;">
                <select id="modo_viaje" v-model="form.modo_viaje" class="md-input" required>
                  <option value="" disabled hidden></option>
                  <option value="Avión">✈️ Avión</option>
                  <option value="Bus / Transporte Público">🚌 Bus / Público</option>
                  <option value="Vehículo Propio">🚗 Vehículo Propio</option>
                  <option value="Barco / Crucero">🚢 Barco / Crucero</option>
                </select>
                <label for="modo_viaje" class="md-label">Modo de Viaje Principal</label>
              </div>
            </div>

            <div class="md-input-group">
              <select id="moneda_codigo" v-model="form.moneda_codigo" class="md-input" required>
                <option value="" disabled hidden></option>
                <option value="COP">Pesos Colombianos (COP)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
              <label for="moneda_codigo" class="md-label">Moneda a manejar</label>
            </div>

            <div class="md-input-group">
              <input id="presupuesto" type="number" v-model="form.presupuesto" min="0" step="0.01" class="md-input" placeholder=" " />
              <label for="presupuesto" class="md-label">Presupuesto estimado (opcional)</label>
            </div>

            <div v-if="errorMsg" class="error-msg">
              <span class="icon">⚠️</span> {{ errorMsg }}
            </div>

            <div class="form-actions">
              <button v-if="isEditing" type="button" @click="cancelEdit" class="md-btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" :disabled="loading" class="md-btn btn-primary">
                {{ loading ? 'Guardando...' : (isEditing ? 'Actualizar Viaje' : 'Guardar Viaje') }}
              </button>
            </div>
          </form>
        </div>

        <!-- Trips List -->
        <div class="md-card elevate-1 list-card">
          <h3 class="title">Mis Viajes</h3>
          
          <div v-if="fetchingViajes" class="loading-state">
            Cargando viajes...
          </div>
          <div v-else-if="viajes.length === 0" class="empty-state">
            No tienes viajes registrados aún.
          </div>
          
          <ul v-else class="trips-list">
            <li v-for="viaje in viajes" :key="viaje.id" class="trip-item">
              <div class="trip-info">
                <h4 class="trip-country">
                  <img :src="getFlagSrcByName(viaje.pais)" class="flag-icon-large" v-if="getFlagSrcByName(viaje.pais)"/>
                  <span v-else>✈️</span>
                  {{ viaje.pais }}
                </h4>
                <div class="trip-details">
                  <span class="detail-badge">📅 {{ viaje.fecha }}</span>
                  <span class="detail-badge">🧑‍🤝‍🧑 {{ viaje.cantidad_personas }} {{ viaje.cantidad_personas === 1 ? 'persona' : 'personas' }}</span>
                  <span class="detail-badge">💵 {{ viaje.moneda_codigo }}</span>
                  <span v-if="viaje.presupuesto" class="detail-badge budget-badge">💰 Presupuesto: {{ viaje.presupuesto }} {{ viaje.moneda_codigo }}</span>
                </div>
              </div>
              <div class="trip-actions">
                <button @click="abrirTablero(viaje)" class="action-btn open-btn" title="Abrir Tablero Principal">🎛️ Abrir</button>
                <button v-if="!viaje.presupuesto" @click="askPresupuesto(viaje)" class="action-btn budget-btn" title="Definir Presupuesto">💲</button>
                <button @click="editViaje(viaje)" class="action-btn edit-btn" title="Editar">✏️</button>
                <button @click="deleteViaje(viaje.id)" class="action-btn delete-btn" title="Eliminar">🗑️</button>
              </div>
            </li>
          </ul>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

interface Viaje {
  id: string
  pais: string
  fecha: string
  cantidad_personas: number
  moneda_codigo: string
  presupuesto: number | null
  motivo_viaje: string
  alojamiento: string
  modo_viaje: string
}

const authStore = useAuthStore()
const router = useRouter()

const latamCountries = [
  { name: 'Argentina', code: 'ar' },
  { name: 'Bolivia', code: 'bo' },
  { name: 'Brasil', code: 'br' },
  { name: 'Chile', code: 'cl' },
  { name: 'Colombia', code: 'co' },
  { name: 'Costa Rica', code: 'cr' },
  { name: 'Cuba', code: 'cu' },
  { name: 'Ecuador', code: 'ec' },
  { name: 'El Salvador', code: 'sv' },
  { name: 'Guatemala', code: 'gt' },
  { name: 'Honduras', code: 'hn' },
  { name: 'México', code: 'mx' },
  { name: 'Nicaragua', code: 'ni' },
  { name: 'Panamá', code: 'pa' },
  { name: 'Paraguay', code: 'py' },
  { name: 'Perú', code: 'pe' },
  { name: 'Puerto Rico', code: 'pr' },
  { name: 'República Dominicana', code: 'do' },
  { name: 'Uruguay', code: 'uy' },
  { name: 'Venezuela', code: 've' }
]

const isCountryMenuOpen = ref(false)

const getFlagSrcByName = (name: string) => {
  const c = latamCountries.find(x => x.name === name);
  return c ? `https://flagcdn.com/w20/${c.code}.png` : '';
}

const selectCountry = (name: string) => {
  form.value.pais = name;
  isCountryMenuOpen.value = false;
}

const delayedCloseMenu = () => {
  setTimeout(() => { isCountryMenuOpen.value = false; }, 200);
}

// Form State
const form = ref({
  id: '',
  pais: '',
  fecha: '',
  cantidad_personas: 1,
  moneda_codigo: 'COP',
  presupuesto: null as number | null,
  motivo_viaje: '',
  alojamiento: '',
  modo_viaje: ''
})

const loading = ref(false)
const errorMsg = ref('')
const isEditing = ref(false)

// Trips State
const viajes = ref<Viaje[]>([])
const fetchingViajes = ref(true)

// Fetch Viajes
const loadViajes = async () => {
  fetchingViajes.value = true
  const me = authStore.user?.id;
  if (!me) return;

  try {
    // 1. Viajes Creados por mí
    const { data: misViajes } = await supabase
      .from('viajes').select('*').eq('user_id', me);
      
    // 2. Viajes a los que fui invitado
    const { data: misParticipaciones } = await supabase
      .from('participantes').select('viaje_id').eq('user_id', me);
      
    let viajesInvitado: any[] = [];
    if (misParticipaciones && misParticipaciones.length > 0) {
      const tripIds = misParticipaciones.map((p: any) => p.viaje_id);
      const { data: invData } = await supabase
        .from('viajes').select('*').in('id', tripIds);
      if (invData) viajesInvitado = invData;
    }

    // Unir y Remover duplicados
    const combo = [...(misViajes || []), ...viajesInvitado];
    const map = new Map();
    combo.forEach(trip => map.set(trip.id, trip));
    
    viajes.value = Array.from(map.values()).sort((a, b) => 
       new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  } catch (err: any) {
    console.error('Error fetching trips:', err.message)
  }
  
  fetchingViajes.value = false
}

onMounted(() => {
  loadViajes()
})

const saveViaje = async () => {
  loading.value = true
  errorMsg.value = ''
  
  try {
    const tripData = {
      user_id: authStore.user?.id, 
      pais: form.value.pais,
      fecha: form.value.fecha,
      cantidad_personas: form.value.cantidad_personas,
      moneda_codigo: form.value.moneda_codigo,
      presupuesto: form.value.presupuesto,
      motivo_viaje: form.value.motivo_viaje,
      alojamiento: form.value.alojamiento,
      modo_viaje: form.value.modo_viaje
    }

    if (isEditing.value) {
      const { error } = await supabase
        .from('viajes')
        .update(tripData)
        .eq('id', form.value.id)

      if (error) throw error
      else {
        await loadViajes()
        cancelEdit()
      }
    } else {
      const { error } = await supabase
        .from('viajes')
        .insert([tripData])

      if (error) throw error
      else {
        await loadViajes()
        resetForm()
      }
    }
  } catch (err: any) {
    console.error('Error saving trip:', err)
    errorMsg.value = err.message || 'Ocurrió un error inesperado al guardar el viaje.'
  } finally {
    loading.value = false
  }
}

const editViaje = (viaje: Viaje) => {
  isEditing.value = true
  form.value = { ...viaje }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  isEditing.value = false
  resetForm()
}

const deleteViaje = async (id: string) => {
  if (!confirm('¿Seguro que deseas eliminar este viaje?')) return
  
  const { error } = await supabase
    .from('viajes')
    .delete()
    .eq('id', id)
    
  if (error) {
    alert('Error al eliminar: ' + error.message)
  } else {
    viajes.value = viajes.value.filter(t => t.id !== id)
  }
}

const askPresupuesto = async (viaje: Viaje) => {
  const amount = prompt(`¿Qué presupuesto tienes en mente para tu viaje a ${viaje.pais}? (en ${viaje.moneda_codigo})`)
  if (amount && !isNaN(Number(amount))) {
    const parsedAmount = parseFloat(amount);
    const { error } = await supabase
      .from('viajes')
      .update({ presupuesto: parsedAmount })
      .eq('id', viaje.id);
      
    if (error) {
      alert('Error al guardar presupuesto: Asegúrate de haber creado la columna "presupuesto" de tipo numérico en tu base de datos Supabase.');
    } else {
      viaje.presupuesto = parsedAmount;
    }
  } else if (amount !== null) {
    alert('Por favor ingresa un valor numérico válido.');
  }
}

const resetForm = () => {
  form.value = {
    id: '',
    pais: '',
    fecha: '',
    cantidad_personas: 1,
    moneda_codigo: 'COP',
    presupuesto: null,
    motivo_viaje: '',
    alojamiento: '',
    modo_viaje: ''
  }
  errorMsg.value = ''
}

const logout = async () => {
  await supabase.auth.signOut()
  authStore.user = null
  authStore.role = null
  router.push('/')
}

const abrirTablero = (viaje: Viaje) => {
  router.push(`/viaje/${viaje.id}`)
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  box-shadow: var(--shadow-1);
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.btn-logout {
  background-color: transparent;
  color: var(--md-sys-color-on-primary-container);
  border: 1px solid var(--md-sys-color-on-primary-container);
  box-shadow: none;
}

.btn-logout:hover {
  background-color: var(--md-sys-color-on-primary-container);
  color: var(--md-sys-color-primary-container);
  box-shadow: var(--shadow-1);
}

.dashboard-content {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  flex: 1;
}

.md-card {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  border-radius: 24px;
  padding: 32px;
  box-shadow: var(--shadow-1);
  width: 100%;
}

.profile-section {
  max-width: 1000px;
  text-align: center;
}

.crud-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  width: 100%;
  max-width: 1000px;
  align-items: flex-start;
}

.form-card {
  flex: 1;
  min-width: 300px;
}

.list-card {
  flex: 1.5;
  min-width: 300px;
}

.title {
  font-size: 22px;
  color: var(--md-sys-color-primary);
  margin: 0 0 24px 0;
}

.info-badge {
  display: inline-block;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-primary);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--md-sys-color-error);
  color: var(--md-sys-color-on-error);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  flex: 1;
}

.btn-secondary {
  flex: 1;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
}

.btn-secondary:hover {
  background-color: var(--md-sys-color-outline);
  color: var(--md-sys-color-surface);
}

.empty-state, .loading-state {
  text-align: center;
  padding: 40px;
  color: var(--md-sys-color-outline);
  font-style: italic;
}

.trips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.trip-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-1);
}

.trip-country {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--md-sys-color-on-surface);
}

.trip-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-badge {
  background-color: var(--md-sys-color-surface);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--md-sys-color-outline);
  border: 1px solid var(--md-sys-color-outline);
}

.trip-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: var(--md-sys-color-surface);
}

.open-btn {
  color: var(--md-sys-color-primary);
  font-size: 14px;
  font-weight: bold;
  background-color: var(--md-sys-color-primary-container);
  border-radius: 8px;
  padding: 8px 16px;
  border: 1px solid var(--md-sys-color-primary);
}

.open-btn:hover {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.budget-badge {
  color: var(--md-sys-color-primary);
  border-color: var(--md-sys-color-primary);
  background-color: var(--md-sys-color-primary-container);
  font-weight: 600;
}

.budget-btn {
  color: var(--md-sys-color-primary);
}

/* Custom Select Flag Styles */
.custom-select-wrapper {
  position: relative;
}
.custom-select {
  cursor: pointer;
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  outline: none;
}
.dropdown-arrow {
  font-size: 0.8rem;
  color: var(--md-sys-color-outline);
  transition: transform 0.3s ease;
}
.arrow-up {
  transform: rotate(180deg);
}
.selected-country {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  font-size: 16px;
  margin: 0 !important;
  padding: 0 !important;
}
.flag-icon {
  width: 20px;
  height: 14px;
  object-fit: cover;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.flag-icon-large {
  width: 28px;
  height: 20px;
  object-fit: cover;
  border-radius: 3px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  margin-right: 8px;
  vertical-align: middle;
}
.custom-options-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--md-sys-color-surface);
  border-radius: 8px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
  margin: 4px 0 0 0;
  padding: 8px 0;
  list-style: none;
  box-shadow: var(--shadow-2);
  border: 1px solid var(--md-sys-color-outline-variant);
}
.custom-option {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: var(--md-sys-color-on-surface);
  font-size: 16px;
}
.custom-option:hover {
  background-color: var(--md-sys-color-surface-container-highest);
}

select.md-input {
  appearance: none;
}
.md-input:focus ~ .md-label,
.md-input:valid ~ .md-label {
  transform: translateY(-8px) scale(0.75);
  color: var(--md-sys-color-primary);
}
</style>
