<template>
  <div class="admin-container fade-in">
    <!-- Header -->
    <header class="admin-header">
      <div class="header-left">
        <h1 class="header-title">🛡️ Panel de Administración</h1>
        <span class="header-sub">{{ authStore.user?.email }}</span>
      </div>
      <button @click="logout" class="md-btn btn-logout">Cerrar Sesión</button>
    </header>

    <!-- Tab Navigation -->
    <nav class="admin-nav">
      <button :class="['nav-tab', { active: activeTab === 'resumen' }]" @click="activeTab = 'resumen'">📊 Resumen</button>
      <button :class="['nav-tab', { active: activeTab === 'usuarios' }]" @click="switchTab('usuarios')">👥 Usuarios</button>
      <button :class="['nav-tab', { active: activeTab === 'viajes' }]" @click="switchTab('viajes')">✈️ Viajes</button>
      <button :class="['nav-tab', { active: activeTab === 'sistema' }]" @click="switchTab('sistema')">⚙️ Sistema</button>
    </nav>

    <!-- Content -->
    <main class="admin-content">

      <!-- Loading Screen -->
      <div v-if="loading" class="loading-state">
        <div class="md-spinner"></div>
        <p>Cargando datos del panel...</p>
      </div>

      <div v-else-if="error" class="error-banner">
        <span>⚠️ {{ error }}</span>
        <button @click="loadStats" class="md-btn btn-retry">Reintentar</button>
      </div>

      <!-- TAB 1: RESUMEN -->
      <template v-else>
        <section v-if="activeTab === 'resumen'" class="tab-content fade-in">
          <!-- Stats Cards -->
          <div class="stats-grid">
            <div class="stat-card stat-users">
              <div class="stat-icon">👥</div>
              <div class="stat-data">
                <span class="stat-number">{{ stats.totalUsers }}</span>
                <span class="stat-label">Usuarios Registrados</span>
              </div>
            </div>
            <div class="stat-card stat-trips">
              <div class="stat-icon">✈️</div>
              <div class="stat-data">
                <span class="stat-number">{{ stats.totalTrips }}</span>
                <span class="stat-label">Viajes Creados</span>
              </div>
            </div>
            <div class="stat-card stat-budget">
              <div class="stat-icon">💰</div>
              <div class="stat-data">
                <span class="stat-number">{{ formatCurrency(stats.totalBudget) }}</span>
                <span class="stat-label">Presupuesto Global</span>
              </div>
            </div>
            <div class="stat-card stat-expenses">
              <div class="stat-icon">💸</div>
              <div class="stat-data">
                <span class="stat-number">{{ formatCurrency(stats.totalExpenses) }}</span>
                <span class="stat-label">Total Gastado</span>
              </div>
            </div>
          </div>

          <!-- Recent Tables -->
          <div class="recent-grid">
            <div class="recent-card">
              <h3 class="section-title">🕐 Últimos Usuarios</h3>
              <div v-if="stats.recentUsers.length === 0" class="empty-mini">Sin usuarios aún</div>
              <table v-else class="admin-table mini-table">
                <thead>
                  <tr><th>Nombre</th><th>Rol</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  <tr v-for="u in stats.recentUsers" :key="u.id">
                    <td>{{ u.nombre || 'Sin nombre' }} {{ u.apellido || '' }}</td>
                    <td><span :class="['role-badge', `role-${u.role}`]">{{ u.role }}</span></td>
                    <td>{{ formatDate(u.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="recent-card">
              <h3 class="section-title">🕐 Últimos Viajes</h3>
              <div v-if="stats.recentTrips.length === 0" class="empty-mini">Sin viajes aún</div>
              <table v-else class="admin-table mini-table">
                <thead>
                  <tr><th>País</th><th>Fecha</th><th>Personas</th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in stats.recentTrips" :key="t.id">
                    <td>{{ t.pais }}</td>
                    <td>{{ t.fecha }}</td>
                    <td>{{ t.cantidad_personas }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'usuarios'" class="tab-content fade-in">
          <div class="toolbar">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input v-model="userSearch" type="text" placeholder="Buscar por nombre, email o teléfono..." class="search-input" />
            </div>
            <span class="result-count">{{ filteredUsers.length }} usuario(s)</span>
          </div>

          <div v-if="loadingUsers" class="loading-state small"><div class="md-spinner"></div></div>
          <div v-else class="table-wrapper">
            <table class="admin-table full-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>ID</th>
                  <th>Rol</th>
                  <th>Registrado</th>
                  <th>Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'row-admin': user.role === 'super_admin' }">
                  <td class="name-cell">
                    <strong>{{ user.nombre || '—' }} {{ user.apellido || '' }}</strong>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.codigo_pais }}{{ user.telefono || '—' }}</td>
                  <td class="id-cell">{{ user.identificacion || '—' }}</td>
                  <td>
                    <select
                      :value="user.role"
                      @change="changeRole(user, ($event.target as HTMLSelectElement).value)"
                      :disabled="updatingRole === user.id || user.id === authStore.user?.id"
                      class="role-select"
                      :class="`role-${user.role}`"
                    >
                      <option value="usuario">👤 Usuario</option>
                      <option value="Individual">🧳 Individual</option>
                      <option value="Grupal">👥 Grupal</option>
                      <option value="conductor">🚗 Conductor</option>
                      <option value="super_admin">🛡️ Super Admin</option>
                    </select>
                    <span v-if="updatingRole === user.id" class="updating-indicator">⏳</span>
                  </td>
                  <td>{{ formatDate(user.created_at) }}</td>
                  <td>{{ user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Nunca' }}</td>
                  <td class="actions-cell">
                    <button
                      v-if="user.id !== authStore.user?.id"
                      @click="confirmDeleteUser(user)"
                      class="table-action-btn btn-danger"
                      title="Eliminar usuario"
                    >🗑️ Eliminar</button>
                    <span v-else class="self-label">Yo</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="filteredUsers.length === 0" class="empty-state">No se encontraron usuarios con ese criterio.</div>
          </div>

          <!-- Modal Confirmar Eliminación Usuario -->
          <Teleport to="body">
            <div v-if="deletingUser" class="modal-overlay" @click.self="deletingUser = null">
              <div class="modal-card">
                <div class="modal-icon">👤</div>
                <h3 class="modal-title">Eliminar Usuario</h3>
                <p class="modal-body">
                  ¿Estás seguro de que deseas eliminar a
                  <strong>{{ deletingUser.nombre || deletingUser.email }}</strong>?
                </p>
                <div class="modal-info-box">
                  <p>📧 <strong>Email:</strong> {{ deletingUser.email }}</p>
                  <p>📱 <strong>WhatsApp:</strong> {{ deletingUser.codigo_pais }}{{ deletingUser.telefono || 'no registrado' }}</p>
                </div>
                <p class="modal-warning">⚠️ Se eliminarán su cuenta, viajes, gastos y participaciones. El correo y número de teléfono <strong>no podrán usarse</strong> en la web ni en el bot. <strong>No se puede deshacer.</strong></p>
                <div class="modal-actions">
                  <button @click="deletingUser = null" class="modal-btn btn-cancel" :disabled="deleteUserLoading">Cancelar</button>
                  <button @click="deleteUser" class="modal-btn btn-confirm-delete" :disabled="deleteUserLoading">
                    <span v-if="deleteUserLoading">⏳ Eliminando...</span>
                    <span v-else>🗑️ Sí, eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </section>

        <section v-if="activeTab === 'viajes'" class="tab-content fade-in">
          <div class="toolbar">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input v-model="tripSearch" type="text" placeholder="Buscar por país o creador..." class="search-input" />
            </div>
            <span class="result-count">{{ filteredTrips.length }} viaje(s)</span>
          </div>

          <div v-if="loadingTrips" class="loading-state small"><div class="md-spinner"></div></div>
          <div v-else class="table-wrapper">
            <table class="admin-table full-table">
              <thead>
                <tr>
                  <th>País / Ciudad</th>
                  <th>Creador</th>
                  <th>Fecha</th>
                  <th>Personas</th>
                  <th>Presupuesto</th>
                  <th>Gastado</th>
                  <th>Participantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="trip in filteredTrips" :key="trip.id">
                  <td>
                    <strong>{{ trip.pais }}</strong>
                    <span v-if="trip.ciudad" class="city-sub">{{ trip.ciudad }}</span>
                  </td>
                  <td>{{ trip.creator_name }}</td>
                  <td>{{ trip.fecha }}</td>
                  <td class="center-cell">{{ trip.cantidad_personas }}</td>
                  <td>{{ trip.presupuesto ? `${Number(trip.presupuesto).toFixed(0)} ${trip.moneda_codigo}` : '—' }}</td>
                  <td :class="{ 'text-danger': trip.totalExpenses > 0 }">
                    {{ trip.totalExpenses > 0 ? `${trip.totalExpenses.toFixed(0)} ${trip.moneda_codigo}` : '—' }}
                  </td>
                  <td class="center-cell">{{ trip.participantsCount }}</td>
                  <td class="actions-cell">
                    <button @click="openTrip(trip.id)" class="table-action-btn" title="Abrir tablero">🔗 Ver</button>
                    <button @click="confirmDeleteTrip(trip)" class="table-action-btn btn-danger" title="Eliminar viaje">🗑️ Eliminar</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="filteredTrips.length === 0" class="empty-state">No se encontraron viajes con ese criterio.</div>
          </div>
        </section>

        <!-- Modal Confirmar Eliminación -->
        <Teleport to="body">
          <div v-if="deletingTrip" class="modal-overlay" @click.self="deletingTrip = null">
            <div class="modal-card">
              <div class="modal-icon">🗑️</div>
              <h3 class="modal-title">Eliminar Viaje</h3>
              <p class="modal-body">
                ¿Estás seguro de que deseas eliminar el viaje a
                <strong>{{ deletingTrip.pais }}{{ deletingTrip.ciudad ? ` (${deletingTrip.ciudad})` : '' }}</strong>
                de <strong>{{ deletingTrip.creator_name }}</strong>?
              </p>
              <p class="modal-warning">⚠️ Esta acción eliminará también todos los gastos y participantes del viaje. <strong>No se puede deshacer.</strong></p>
              <div class="modal-actions">
                <button @click="deletingTrip = null" class="modal-btn btn-cancel" :disabled="deleteLoading">Cancelar</button>
                <button @click="deleteTrip" class="modal-btn btn-confirm-delete" :disabled="deleteLoading">
                  <span v-if="deleteLoading">⏳ Eliminando...</span>
                  <span v-else>🗑️ Sí, eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- TAB 4: SISTEMA -->
        <section v-if="activeTab === 'sistema'" class="tab-content fade-in">
          <div class="system-grid">
            <div class="system-card">
              <h3 class="section-title">Estado de Servicios</h3>
              <div v-if="checkingHealth" class="loading-state small"><div class="md-spinner"></div></div>
              <div v-else-if="systemHealth" class="health-list">
                <div class="health-item">
                  <span :class="['health-dot', `dot-${systemHealth.otpServer.status}`]"></span>
                  <span class="health-name">OTP Server (Node.js)</span>
                  <span class="health-status">{{ systemHealth.otpServer.status.toUpperCase() }}</span>
                </div>
                <div class="health-item">
                  <span :class="['health-dot', `dot-${systemHealth.supabase.status}`]"></span>
                  <span class="health-name">Supabase (Base de Datos)</span>
                  <span class="health-status">{{ systemHealth.supabase.status.toUpperCase() }}</span>
                </div>
                <div class="health-item">
                  <span :class="['health-dot', `dot-${systemHealth.evolutionApi.status}`]"></span>
                  <span class="health-name">Evolution API (WhatsApp)</span>
                  <span class="health-status">{{ systemHealth.evolutionApi.status.toUpperCase() }}</span>
                </div>
              </div>
              <button @click="checkHealth" :disabled="checkingHealth" class="md-btn btn-health">
                {{ checkingHealth ? 'Verificando...' : '🔄 Verificar Conexiones' }}
              </button>
            </div>

            <div class="system-card">
              <h3 class="section-title">Información del Entorno</h3>
              <div class="env-list">
                <div class="env-item">
                  <span class="env-label">Supabase URL</span>
                  <span class="env-value">{{ supabaseUrl }}</span>
                </div>
                <div class="env-item">
                  <span class="env-label">OTP Server</span>
                  <span class="env-value">{{ otpServerUrl }}</span>
                </div>
                <div class="env-item">
                  <span class="env-label">Última verificación</span>
                  <span class="env-value">{{ lastHealthCheck || '—' }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// State
const activeTab = ref<'resumen' | 'usuarios' | 'viajes' | 'sistema'>('resumen')
const loading = ref(true)
const error = ref('')

// Stats
const stats = ref({
  totalUsers: 0,
  totalTrips: 0,
  totalBudget: 0,
  totalExpenses: 0,
  recentUsers: [] as any[],
  recentTrips: [] as any[]
})

// Users
const allUsers = ref<any[]>([])
const userSearch = ref('')
const loadingUsers = ref(false)
const updatingRole = ref<string | null>(null)
const deletingUser = ref<any | null>(null)
const deleteUserLoading = ref(false)

// Trips
const allTrips = ref<any[]>([])
const tripSearch = ref('')
const loadingTrips = ref(false)
const deletingTrip = ref<any | null>(null)
const deleteLoading = ref(false)

// System
const systemHealth = ref<any>(null)
const checkingHealth = ref(false)
const lastHealthCheck = ref('')

// Config
const otpServerUrl = import.meta.env.VITE_OTP_SERVER_URL || 'https://otp-ws.viaje-justo.xyz'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.viaje-justo.xyz'

// Helpers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('No hay sesión activa')
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(0)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Computed
const filteredUsers = computed(() => {
  if (!userSearch.value) return allUsers.value
  const q = userSearch.value.toLowerCase()
  return allUsers.value.filter(u =>
    (u.nombre || '').toLowerCase().includes(q) ||
    (u.apellido || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.telefono || '').includes(q)
  )
})

const filteredTrips = computed(() => {
  if (!tripSearch.value) return allTrips.value
  const q = tripSearch.value.toLowerCase()
  return allTrips.value.filter(t =>
    (t.pais || '').toLowerCase().includes(q) ||
    (t.creator_name || '').toLowerCase().includes(q)
  )
})

// API Calls
const loadStats = async () => {
  loading.value = true
  error.value = ''
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${otpServerUrl}/admin/stats`, { headers })
    if (!res.ok) throw new Error(`Error ${res.status}: ${(await res.json()).error}`)
    stats.value = await res.json()
  } catch (err: any) {
    error.value = err.message || 'Error al cargar estadísticas'
    console.error('[ADMIN]', err)
  } finally {
    loading.value = false
  }
}

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${otpServerUrl}/admin/users`, { headers })
    if (!res.ok) throw new Error('Error al obtener usuarios')
    const data = await res.json()
    allUsers.value = data.users || []
  } catch (err: any) {
    console.error('[ADMIN USERS]', err)
  } finally {
    loadingUsers.value = false
  }
}

const loadTrips = async () => {
  loadingTrips.value = true
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${otpServerUrl}/admin/trips`, { headers })
    if (!res.ok) throw new Error('Error al obtener viajes')
    const data = await res.json()
    allTrips.value = data.trips || []
  } catch (err: any) {
    console.error('[ADMIN TRIPS]', err)
  } finally {
    loadingTrips.value = false
  }
}

const changeRole = async (user: any, newRole: string) => {
  if (newRole === user.role) return
  if (user.id === authStore.user?.id) return

  if (!confirm(`¿Cambiar el rol de ${user.nombre || user.email} a "${newRole}"?`)) return

  updatingRole.value = user.id
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${otpServerUrl}/admin/update-role`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: user.id, newRole })
    })
    if (res.ok) {
      user.role = newRole
    } else {
      alert('Error al actualizar el rol.')
    }
  } catch (err) {
    alert('Error de red al actualizar rol.')
  } finally {
    updatingRole.value = null
  }
}

const checkHealth = async () => {
  checkingHealth.value = true
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${otpServerUrl}/admin/system-health`, { headers })
    if (res.ok) {
      systemHealth.value = await res.json()
      lastHealthCheck.value = new Date().toLocaleString('es-CO')
    }
  } catch (err) {
    console.error('[ADMIN HEALTH]', err)
  } finally {
    checkingHealth.value = false
  }
}

const switchTab = (tab: 'usuarios' | 'viajes' | 'sistema') => {
  activeTab.value = tab
  if (tab === 'usuarios' && allUsers.value.length === 0) loadUsers()
  if (tab === 'viajes' && allTrips.value.length === 0) loadTrips()
  if (tab === 'sistema' && !systemHealth.value) checkHealth()
}

const openTrip = (id: string) => {
  router.push(`/viaje/${id}`)
}

const confirmDeleteUser = (user: any) => {
  deletingUser.value = user
}

const deleteUser = async () => {
  if (!deletingUser.value) return
  deleteUserLoading.value = true
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${otpServerUrl}/admin/users/${deletingUser.value.id}`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al eliminar usuario')
    }
    // Actualizar lista local y stats
    allUsers.value = allUsers.value.filter(u => u.id !== deletingUser.value.id)
    stats.value.totalUsers = Math.max(0, stats.value.totalUsers - 1)
    deletingUser.value = null
  } catch (err: any) {
    alert('❌ ' + (err.message || 'Error al eliminar el usuario.'))
  } finally {
    deleteUserLoading.value = false
  }
}

const confirmDeleteTrip = (trip: any) => {
  deletingTrip.value = trip
}

const deleteTrip = async () => {
  if (!deletingTrip.value) return
  deleteLoading.value = true
  const tripId = deletingTrip.value.id
  try {
    // 1. Eliminar gastos del viaje
    const { error: eGastos } = await supabase
      .from('gastos')
      .delete()
      .eq('viaje_id', tripId)
    if (eGastos) throw new Error('Error al eliminar gastos: ' + eGastos.message)

    // 2. Eliminar participantes del viaje
    const { error: eParticipantes } = await supabase
      .from('participantes')
      .delete()
      .eq('viaje_id', tripId)
    if (eParticipantes) throw new Error('Error al eliminar participantes: ' + eParticipantes.message)

    // 3. Eliminar el viaje
    const { error: eViaje } = await supabase
      .from('viajes')
      .delete()
      .eq('id', tripId)
    if (eViaje) throw new Error('Error al eliminar viaje: ' + eViaje.message)

    // 4. Actualizar lista local y stats
    allTrips.value = allTrips.value.filter(t => t.id !== tripId)
    stats.value.totalTrips = Math.max(0, stats.value.totalTrips - 1)
    deletingTrip.value = null
  } catch (err: any) {
    alert('❌ ' + (err.message || 'Error al eliminar el viaje.'))
  } finally {
    deleteLoading.value = false
  }
}

const logout = async () => {
  await supabase.auth.signOut()
  authStore.user = null
  authStore.role = null
  router.push('/')
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--md-sys-color-background);
}

.fade-in { animation: fadeIn 0.35s cubic-bezier(0.2, 0, 0, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* ─── Header ─────────────────────────── */
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: linear-gradient(135deg, #c0392b, #8e1b1b);
  color: #fff;
  box-shadow: 0 4px 20px rgba(192, 57, 43, 0.3);
}
.header-title { margin: 0; font-size: 22px; font-weight: 700; }
.header-sub { font-size: 13px; opacity: 0.8; }
.btn-logout {
  background-color: rgba(255,255,255,0.15);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
  box-shadow: none;
  backdrop-filter: blur(4px);
}
.btn-logout:hover { background-color: rgba(255,255,255,0.3); }

/* ─── Navigation ─────────────────────── */
.admin-nav {
  display: flex;
  gap: 4px;
  padding: 8px 40px;
  background-color: var(--md-sys-color-surface);
  border-bottom: 1px solid var(--md-sys-color-outline);
  overflow-x: auto;
}
.nav-tab {
  padding: 12px 24px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: var(--md-sys-color-outline);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
}
.nav-tab:hover { color: var(--md-sys-color-on-surface); background-color: var(--md-sys-color-surface-container); }
.nav-tab.active {
  color: #c0392b;
  border-bottom-color: #c0392b;
  background-color: rgba(192, 57, 43, 0.06);
}

/* ─── Content ────────────────────────── */
.admin-content { padding: 32px 40px; flex: 1; }
.tab-content { max-width: 1400px; margin: 0 auto; }

/* ─── Stats Grid ─────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 18px;
  color: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  transition: transform 0.2s;
}
.stat-card:hover { transform: translateY(-3px); }
.stat-users { background: linear-gradient(135deg, #3498db, #2471a3); }
.stat-trips { background: linear-gradient(135deg, #27ae60, #1e8449); }
.stat-budget { background: linear-gradient(135deg, #f39c12, #d68910); }
.stat-expenses { background: linear-gradient(135deg, #e74c3c, #c0392b); }
.stat-icon { font-size: 36px; flex-shrink: 0; }
.stat-data { display: flex; flex-direction: column; }
.stat-number { font-size: 28px; font-weight: 800; line-height: 1.2; }
.stat-label { font-size: 13px; opacity: 0.9; font-weight: 500; }

/* ─── Recent Tables ──────────────────── */
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 24px;
}
.recent-card {
  background-color: var(--md-sys-color-surface);
  border-radius: 18px;
  padding: 24px;
  box-shadow: var(--shadow-1);
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--md-sys-color-on-surface);
  margin: 0 0 16px 0;
}

/* ─── Tables ─────────────────────────── */
.table-wrapper { overflow-x: auto; }
.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.admin-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 700;
  color: var(--md-sys-color-outline);
  border-bottom: 2px solid var(--md-sys-color-outline);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.admin-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  vertical-align: middle;
}
.admin-table tbody tr { transition: background-color 0.15s; }
.admin-table tbody tr:hover { background-color: var(--md-sys-color-surface-container); }
.full-table { background-color: var(--md-sys-color-surface); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-1); }
.mini-table td { padding: 10px 12px; font-size: 13px; }
.center-cell { text-align: center; }
.name-cell strong { color: var(--md-sys-color-primary); }
.id-cell { font-family: monospace; font-size: 12px; color: var(--md-sys-color-outline); }
.row-admin { background-color: rgba(192, 57, 43, 0.04) !important; }

/* ─── Role Badge & Select ────────────── */
.role-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.role-usuario, .role-Individual, .role-Grupal { background: #dbeafe; color: #1e40af; }
.role-conductor { background: #dcfce7; color: #166534; }
.role-super_admin { background: #fef2f2; color: #b91c1c; }

.role-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--md-sys-color-outline);
  font-size: 13px;
  font-family: inherit;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  transition: border-color 0.2s;
}
.role-select:focus { border-color: var(--md-sys-color-primary); outline: none; }
.role-select:disabled { opacity: 0.5; cursor: not-allowed; }
.updating-indicator { margin-left: 6px; animation: pulse 0.8s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ─── Search / Toolbar ───────────────── */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 12px;
  padding: 10px 16px;
  flex: 1;
  max-width: 500px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}
.search-box:focus-within { border-color: var(--md-sys-color-primary); }
.search-icon { font-size: 18px; }
.search-input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  color: var(--md-sys-color-on-surface);
  width: 100%;
}
.result-count {
  font-size: 13px;
  color: var(--md-sys-color-outline);
  font-weight: 500;
  white-space: nowrap;
}

/* ─── Table Action Button ────────────── */
.table-action-btn {
  background: transparent;
  border: 1px solid var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.table-action-btn:hover {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
.table-action-btn.btn-danger {
  border-color: #ef4444;
  color: #ef4444;
  margin-left: 6px;
}
.table-action-btn.btn-danger:hover {
  background-color: #ef4444;
  color: #fff;
}
.actions-cell { white-space: nowrap; }
.city-sub {
  display: block;
  font-size: 12px;
  color: var(--md-sys-color-outline);
  font-weight: 400;
  margin-top: 2px;
}

/* ─── Modal ──────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}
.modal-card {
  background: var(--md-sys-color-surface);
  border-radius: 24px;
  padding: 36px;
  max-width: 440px;
  width: 90%;
  box-shadow: 0 24px 60px rgba(0,0,0,0.35);
  text-align: center;
  animation: slideUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-icon { font-size: 48px; margin-bottom: 12px; }
.modal-title { font-size: 20px; font-weight: 800; margin: 0 0 12px; color: var(--md-sys-color-on-surface); }
.modal-body { font-size: 15px; color: var(--md-sys-color-on-surface); line-height: 1.6; margin-bottom: 14px; }
.modal-warning {
  font-size: 13px; color: #b45309;
  background: #fffbeb; border: 1px solid #fcd34d;
  border-radius: 10px; padding: 10px 14px;
  margin-bottom: 24px; line-height: 1.5;
}
.modal-actions { display: flex; gap: 12px; justify-content: center; }
.modal-btn {
  padding: 12px 28px; border-radius: 12px;
  font-size: 14px; font-weight: 700; font-family: inherit;
  cursor: pointer; border: none; transition: all 0.2s;
}
.btn-cancel {
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
}
.btn-cancel:hover { background: var(--md-sys-color-surface-container-high); }
.btn-confirm-delete {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fff;
  box-shadow: 0 4px 14px rgba(239,68,68,0.4);
}
.btn-confirm-delete:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(239,68,68,0.5); }
.btn-confirm-delete:disabled, .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* ─── System Tab ─────────────────────── */
.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}
.system-card {
  background-color: var(--md-sys-color-surface);
  border-radius: 18px;
  padding: 28px;
  box-shadow: var(--shadow-1);
}
.health-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
.health-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 12px;
}
.health-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-online { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
.dot-offline { background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.5); }
.dot-error { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.5); }
.dot-checking { background: #94a3b8; animation: pulse 1s infinite; }
.health-name { flex: 1; font-weight: 500; color: var(--md-sys-color-on-surface); }
.health-status { font-size: 12px; font-weight: 700; color: var(--md-sys-color-outline); letter-spacing: 0.5px; }
.btn-health {
  width: 100%;
  background: linear-gradient(135deg, #3498db, #2471a3);
  color: #fff;
}

.env-list { display: flex; flex-direction: column; gap: 14px; }
.env-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 10px;
}
.env-label { font-size: 13px; font-weight: 600; color: var(--md-sys-color-outline); }
.env-value { font-size: 13px; color: var(--md-sys-color-on-surface); font-family: monospace; word-break: break-all; }

/* ─── Utility States ─────────────────── */
.loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px; color: var(--md-sys-color-outline);
}
.loading-state.small { padding: 40px; }
.md-spinner {
  width: 40px; height: 40px;
  border: 4px solid var(--md-sys-color-surface-container);
  border-top-color: #c0392b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 40px; color: var(--md-sys-color-outline);
  font-style: italic; font-size: 14px;
}
.empty-mini { text-align: center; padding: 24px; color: var(--md-sys-color-outline); font-size: 13px; }

.error-banner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 16px 24px;
  background-color: #fef2f2; border: 1px solid #fca5a5;
  border-radius: 12px; color: #b91c1c; font-weight: 500;
}
.btn-retry { background: #b91c1c; color: #fff; font-size: 13px; padding: 8px 16px; }
.text-danger { color: #ef4444; font-weight: 600; }

.self-label {
  font-size: 12px;
  color: var(--md-sys-color-outline);
  font-style: italic;
  padding: 4px 8px;
}

.modal-info-box {
  background: var(--md-sys-color-surface-container);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 14px;
  text-align: left;
  font-size: 13px;
  color: var(--md-sys-color-on-surface);
  line-height: 1.8;
}
.modal-info-box p { margin: 0; }

/* ─── Responsive ─────────────────────── */
@media (max-width: 768px) {
  .admin-header { padding: 16px 20px; flex-direction: column; gap: 12px; align-items: flex-start; }
  .admin-nav { padding: 8px 16px; }
  .admin-content { padding: 20px 16px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .recent-grid { grid-template-columns: 1fr; }
  .system-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card { padding: 18px; }
  .stat-number { font-size: 22px; }
}
</style>
