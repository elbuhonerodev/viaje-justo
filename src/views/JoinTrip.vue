<template>
  <div class="join-container fade-in">
    <div class="md-card elevate-2 join-card">
      <div v-if="isValidating" class="loading-state">
        <span class="icon">🔄</span> Validando invitación...
      </div>
      
      <div v-else-if="errorMsg" class="error-state">
        <span class="icon">❌</span> {{ errorMsg }}
        <p>El enlace de invitación puede estar caducado o el viaje fue eliminado.</p>
        <button @click="router.push('/')" class="md-btn btn-primary mt-4">Ir al inicio</button>
      </div>

      <div v-else-if="viaje" class="success-state">
        <h2 class="title">Te han invitado a un Viaje</h2>
        
        <div class="trip-preview">
          <h3>📍 {{ viaje.pais }}</h3>
          <p class="date">📅 {{ viaje.fecha }}</p>
          <div class="badge-container">
            <span class="detail-badge">🧑‍🤝‍🧑 Grupo de {{ viaje.cantidad_personas }} max.</span>
            <span class="detail-badge">💵 Maneja: {{ viaje.moneda_codigo }}</span>
          </div>
          
          <div v-if="timeRemaining > 0" class="timer-badge mt-4">
            ⏳ Caduca en: <strong>{{ formatTime(timeRemaining) }}</strong>
          </div>
        </div>

        <div v-if="!authStore.isInitialized || !authStore.user" class="auth-required">
          <p>Para unirte a este viaje, necesitas estar registrado en la plataforma.</p>
          <div class="actions">
            <button @click="router.push(`/signup?joinTrip=${tripId}`)" class="md-btn btn-primary full-w">Crear Cuenta Rápida</button>
            <button @click="router.push(`/?joinTrip=${tripId}`)" class="md-btn btn-secondary full-w">Ya tengo cuenta</button>
          </div>
        </div>

        <div v-else class="join-form">
          <p class="greeting">Has iniciado sesión como <strong>{{ authStore.user.email }}</strong>.</p>
          <p>Al unirte, podrás confirmar cuánto presupuesto vas a aportar al grupo.</p>
          
          <div class="md-input-group mt-4">
            <input id="mi_nombre" type="text" v-model="miNombre" class="md-input" placeholder=" " required />
            <label for="mi_nombre" class="md-label">¿Cómo te llamas/apodas?</label>
          </div>

          <div class="md-input-group">
            <input id="mi_aporte" type="number" min="0" step="0.01" v-model="miAporte" class="md-input" placeholder=" " required />
            <label for="mi_aporte" class="md-label">Tu fondo de dinero (en {{ viaje.moneda_codigo }})</label>
          </div>

          <button @click="unirseAlViaje" :disabled="isJoining" class="md-btn btn-primary mt-4 full-w">
            {{ isJoining ? 'Vinculando sistema...' : '🎉 Unirme Oficialmente al Viaje' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isValidating = ref(true)
const isJoining = ref(false)
const errorMsg = ref('')
const viaje = ref<any>(null)

const miNombre = ref('')
const miAporte = ref(0)
const tripId = route.params.id as string

const timeRemaining = ref(0)
let timerInterval: any = null

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const checkTimerStatus = () => {
  const expiryKey = `invite_expiry_${tripId}`;
  let expiryTime = localStorage.getItem(expiryKey);
  
  if (!expiryTime) {
    expiryTime = String(Date.now() + 24 * 60 * 60 * 1000);
    localStorage.setItem(expiryKey, expiryTime);
  }

  const diff = Number(expiryTime) - Date.now();
  if (diff <= 0) {
    timeRemaining.value = 0;
    errorMsg.value = 'El tiempo límite de 24 horas para usar este enlace ha expirado.';
    if (timerInterval) clearInterval(timerInterval);
    return false;
  } else {
    timeRemaining.value = diff;
    return true;
  }
}

onMounted(async () => {
  if (!tripId) {
    errorMsg.value = 'Enlace de invitación inválido.'
    isValidating.value = false
    return
  }

  // Check 24hr expiration
  if (!checkTimerStatus()) {
    isValidating.value = false;
    return;
  }

  // Start real-time countdown
  timerInterval = setInterval(() => {
    checkTimerStatus();
  }, 1000);

  // Verificar si el viaje existe y sus datos base
  const { data, error } = await supabase
    .from('viajes')
    .select('id, pais, fecha, cantidad_personas, moneda_codigo, user_id')
    .eq('id', tripId)
    .single()

  if (error || !data) {
    errorMsg.value = 'Viaje no encontrado.'
  } else {
    viaje.value = data
    
    // Si la persona ya tiene sesión, verificar si NO está ya en el viaje
    if (authStore.user) {
      if (viaje.value.user_id === authStore.user.id) {
         // Eres el dueño.
         router.push(`/viaje/${tripId}`)
         return
      }

      const { data: partData } = await supabase
        .from('participantes')
        .select('*')
        .eq('viaje_id', tripId)
        .eq('user_id', authStore.user.id)
        .single()
      
      if (partData) {
        // Ya es miembro activo
        router.push(`/viaje/${tripId}`)
      }
    }
  }

  isValidating.value = false
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
})

const unirseAlViaje = async () => {
  if (timeRemaining.value <= 0) return;
  
  if (!miNombre.value) {
    alert("Por favor ingresa tu nombre/apodo.");
    return;
  }
  
  isJoining.value = true;
  
  const nuevoUser = {
    viaje_id: tripId,
    user_id: authStore.user?.id,
    nombre: miNombre.value,
    aporte: Number(miAporte.value) || 0
  };

  const { error } = await supabase.from('participantes').insert([nuevoUser]);

  if (error) {
    alert("Lo sentimos internamente: " + error.message);
    isJoining.value = false;
  } else {
    router.push(`/viaje/${tripId}`)
  }
}
</script>

<style scoped>
.join-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: var(--md-sys-color-background);
}

.join-card {
  width: 100%;
  max-width: 500px;
  background-color: var(--md-sys-color-surface);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
}

.fade-in { animation: fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.title {
  color: var(--md-sys-color-primary);
  font-size: 24px;
  margin-bottom: 24px;
}

.trip-preview {
  background-color: var(--md-sys-color-surface-container);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 30px;
}
.trip-preview h3 { margin: 0 0 8px 0; font-size: 20px; }
.date { color: var(--md-sys-color-outline); margin: 0 0 16px 0; font-size: 14px; }

.badge-container { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.detail-badge {
  background-color: var(--md-sys-color-surface);
  padding: 6px 12px; border-radius: 12px; font-size: 12px;
  color: var(--md-sys-color-outline); border: 1px solid var(--md-sys-color-outline);
}

.actions { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
.full-w { width: 100%; }

.greeting { font-size: 16px; margin-bottom: 8px; }
.mt-4 { margin-top: 24px; }
.loading-state, .error-state { font-size: 18px; color: var(--md-sys-color-on-surface); }
.error-state .icon { font-size: 40px; display: block; margin-bottom: 16px; }

.btn-secondary {
  background-color: transparent;
  color: var(--md-sys-color-primary);
  border: 1px solid var(--md-sys-color-primary);
}
.btn-secondary:hover {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}

.timer-badge {
  background-color: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
  padding: 8px 16px; 
  border-radius: 12px;
  display: inline-block;
  font-family: monospace;
  font-size: 16px;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* Fix CSS for floating labels on inputs */
.md-input-group { position: relative; margin-top: 16px; margin-bottom: 16px; }
.md-input {
  width: 100%; border: 1px solid var(--md-sys-color-outline);
  border-radius: 8px; padding: 16px; font-size: 16px;
  background-color: transparent; color: var(--md-sys-color-on-surface);
  box-sizing: border-box; transition: border-color 0.2s;
}
.md-label {
  position: absolute; left: 12px; top: 16px;
  background-color: var(--md-sys-color-surface);
  padding: 0 4px; color: var(--md-sys-color-outline);
  transition: 0.2s; pointer-events: none;
}
.md-input:focus, .md-input:not(:placeholder-shown) { border-color: var(--md-sys-color-primary); outline: none; }
.md-input:focus ~ .md-label, .md-input:not(:placeholder-shown) ~ .md-label {
  transform: translateY(-24px) scale(0.85); color: var(--md-sys-color-primary);
}
</style>
