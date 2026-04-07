<template>
  <div class="auth-wrapper">
    <div class="md-card elevate-2 fade-in">
      <div class="md-card-header">
        <h1 class="title">Nueva Contraseña</h1>
        <p class="subtitle">Ingresa tu nueva contraseña para acceder</p>
      </div>

      <form @submit.prevent="updatePassword" class="auth-form">
        <div class="md-input-group">
          <input 
            id="newPassword" 
            type="password" 
            v-model="newPassword" 
            class="md-input" 
            placeholder=" " 
            required 
            minlength="6"
          />
          <label for="newPassword" class="md-label">Nueva Contraseña</label>
        </div>

        <div class="md-input-group">
          <input 
            id="confirmPassword" 
            type="password" 
            v-model="confirmPassword" 
            class="md-input" 
            placeholder=" " 
            required 
            minlength="6"
          />
          <label for="confirmPassword" class="md-label">Confirmar Contraseña</label>
        </div>

        <div v-if="errorMsg" class="error-msg">
          <span class="icon">⚠️</span> {{ errorMsg }}
        </div>
        
        <div v-if="successMsg" style="color: var(--md-sys-color-primary); background-color: var(--md-sys-color-primary-container); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;">
          <span class="icon">✅</span> {{ successMsg }}
        </div>

        <button type="submit" :disabled="loading" class="md-btn full-width">
          {{ loading ? 'Actualizando...' : 'Guardar nueva contraseña' }}
        </button>

        <button type="button" @click="$router.push('/')" class="md-btn text full-width" style="margin-top: 8px; background: transparent; color: var(--md-sys-color-primary);">
          Ir a Inicio de Sesión
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

onMounted(async () => {
  // Cuando se llega desde el mail, Supabase automáticamente captura el fragment (#access_token)
  // e inicia una sesión en cliente temporal para permitir la actualización de la constraseña.
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    errorMsg.value = 'El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.'
  }
})

const updatePassword = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Las contraseñas no coinciden.'
    return
  }

  loading.value = true
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword.value
  })
  
  loading.value = false

  if (error) {
    errorMsg.value = 'Error al actualizar: ' + error.message
  } else {
    successMsg.value = 'Contraseña actualizada correctamente. Redirigiendo...'
    setTimeout(() => {
      router.push('/dashboard-user')
    }, 2000)
  }
}
</script>

<style scoped>
.auth-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: var(--md-sys-color-background);
}

.md-card {
  width: 100%;
  max-width: 420px;
  background-color: var(--md-sys-color-surface);
  border-radius: 24px;
  padding: 40px;
}

.md-card-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  color: var(--md-sys-color-primary);
  font-size: 28px;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.subtitle {
  color: var(--md-sys-color-outline);
  margin: 0;
  font-size: 16px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.md-input-group {
  position: relative;
  display: flex;
  flex-direction: column;
}

.md-input {
  background-color: transparent;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 4px;
  padding: 16px;
  font-size: 16px;
  color: var(--md-sys-color-on-surface);
  transition: all 0.2s ease;
  outline: none;
}

.md-input:focus {
  border-color: var(--md-sys-color-primary);
  border-width: 2px;
  padding: 15px; /* Compensa el borde extra */
}

.md-label {
  position: absolute;
  left: 12px;
  top: 16px;
  background-color: var(--md-sys-color-surface);
  padding: 0 4px;
  color: var(--md-sys-color-outline);
  transition: all 0.2s ease;
  pointer-events: none;
}

.md-input:focus ~ .md-label,
.md-input:not(:placeholder-shown) ~ .md-label {
  top: -8px;
  font-size: 12px;
  color: var(--md-sys-color-primary);
}

.md-btn {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  border-radius: 100px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.md-btn:hover {
  box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
  filter: brightness(1.1);
}

.md-btn:disabled {
  background-color: var(--md-sys-color-surface-variant);
  color: var(--md-sys-color-on-surface-variant);
  cursor: not-allowed;
  box-shadow: none;
}

.full-width {
  width: 100%;
}

.error-msg {
  color: var(--md-sys-color-error);
  background-color: var(--md-sys-color-error-container);
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
