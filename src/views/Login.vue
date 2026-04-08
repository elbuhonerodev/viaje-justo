<template>
  <div class="auth-wrapper">
    <div class="md-card elevate-2 fade-in">
      <div class="md-card-header">
        <h1 class="title">Bienvenido de vuelta</h1>
        <h2 class="subtitle">Ingresa tus datos para continuar</h2>
      </div>

      <!-- Pantalla Principal de Login -->
      <div v-if="!showOtpStep">
        <form @submit.prevent="handleLogin" class="auth-form">
          <div class="md-input-group" style="position: relative;">
            <input 
              id="email" 
              type="text" 
              v-model="email" 
              @input="handleEmailInput"
              @focus="showEmailSuggestions = emailSuggestions.length > 0"
              @blur="hideEmailSuggestions"
              class="md-input" 
              placeholder=" " 
              required 
            />
            <label for="email" class="md-label">Correo electrónico o Teléfono (+57...)</label>
            
            <!-- Autocomplete Dropdown Estilo Binance -->
            <ul v-if="showEmailSuggestions" class="autocomplete-dropdown">
              <li 
                v-for="suggestion in emailSuggestions" 
                :key="suggestion" 
                @mousedown.prevent="selectEmail(suggestion)"
              >
                {{ suggestion }}
              </li>
            </ul>
          </div>
          
          <div class="md-input-group">
            <input 
              id="password" 
              type="password" 
              v-model="password" 
              class="md-input" 
              placeholder=" " 
              required 
            />
            <label for="password" class="md-label">Contraseña</label>
          </div>

          <div v-if="errorMsg" class="error-msg">
            <span class="icon">⚠️</span> {{ errorMsg }}
          </div>
          
          <div style="text-align: right; margin-top: -8px; margin-bottom: 16px;">
            <a href="#" @click.prevent="openResetPassword" class="text-link" style="font-size: 14px;">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit" :disabled="loading" class="md-btn full-width">
            {{ loading ? 'Iniciando...' : 'Entrar' }}
          </button>
        </form>
        
        <div class="md-card-footer">
          <p class="body-text">
            ¿No tienes una cuenta? <router-link to="/signup" class="text-link">Regístrate ahora</router-link>
          </p>
        </div>
      </div>

      <!-- Pantalla de Recuperación de Contraseña -->
      <div v-else-if="showResetStep" class="fade-in">
        <form @submit.prevent="handleResetPassword" class="auth-form">
          <p class="body-text" style="text-align: center; margin-bottom: 16px;">
            Ingresa tu correo para recibir un enlace de recuperación validando tu identidad.
          </p>

          <div class="md-input-group">
            <input 
              id="resetToken" 
              type="text" 
              v-model="email" 
              class="md-input" 
              placeholder=" " 
              required 
            />
            <label for="resetToken" class="md-label">Correo electrónico</label>
          </div>

          <div v-if="errorMsg" class="error-msg">
            <span class="icon">⚠️</span> {{ errorMsg }}
          </div>
          
          <div v-if="successMsg" style="color: var(--md-sys-color-primary); background-color: var(--md-sys-color-primary-container); padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 14px;">
            <span class="icon">✅</span> {{ successMsg }}
          </div>

          <button type="submit" :disabled="loading" class="md-btn full-width">
            {{ loading ? 'Enviando...' : 'Enviar enlace de recuperación' }}
          </button>

          <button type="button" @click="showResetStep = false; errorMsg = ''; successMsg = '';" class="md-btn text full-width" style="margin-top: 8px; background: transparent; color: var(--md-sys-color-primary);">
            Volver a inicio de sesión
          </button>
        </form>
      </div>

      <!-- Pantalla Secundaria de Verificación 2FA OTP -->
      <form v-else-if="showOtpStep" @submit.prevent="handleVerifyOtp" class="auth-form fade-in">
        <p class="body-text" style="text-align: center; margin-bottom: 16px;">
          Ingresa el código que hemos enviado por WhatsApp a<br>
          <strong>{{ formattedPhone }}</strong>
        </p>
        
        <div class="md-input-group">
          <input 
            id="otp" 
            type="text" 
            v-model="otpCode" 
            class="md-input" 
            placeholder=" " 
            required 
            maxlength="6"
            style="text-align: center; letter-spacing: 4px; font-weight: bold; font-size: 20px;"
          />
          <label for="otp" class="md-label">Código de Verificación</label>
        </div>
        
        <div v-if="errorMsg" class="error-msg">
          <span class="icon">⚠️</span> {{ errorMsg }}
        </div>
        
        <button type="submit" :disabled="loading" class="md-btn full-width">
          {{ loading ? 'Verificando...' : 'Verificar e Iniciar Sesión' }}
        </button>
        
        <button 
          type="button" 
          @click="resendOtp" 
          :disabled="resendTimer > 0 || loading" 
          class="md-btn full-width" 
          style="margin-top: 8px; background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);"
        >
          {{ resendTimer > 0 ? `Reenviar código en ${resendTimer}s` : 'Reenviar código' }}
        </button>

        <button type="button" @click="showOtpStep = false; errorMsg = '';" class="md-btn text full-width" style="margin-top: 8px; background: transparent; color: var(--md-sys-color-primary);">
          Volver atrás
        </button>
      </form>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../supabase'
import { useAuthStore } from '../stores/auth'

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Si venimos de un link de invitación mediante "Ya tengo cuenta"
const pendingJoinTrip = computed(() => route.query.joinTrip as string | undefined)

// State para 2FA OTP y Recovery
const showOtpStep = ref(false)
const showResetStep = ref(false)
const otpCode = ref('')
const successMsg = ref('')
const resendTimer = ref(0)
let timerInterval: any = null

const startResendTimer = () => {
  resendTimer.value = 10
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (resendTimer.value > 0) {
      resendTimer.value--
    } else {
      clearInterval(timerInterval)
    }
  }, 1000)
}

const getOtpUrl = () => {
  return import.meta.env.VITE_OTP_SERVER_URL || 'https://otp-ws.viaje-justo.xyz';
}

const formattedPhone = computed(() => {
  return email.value;
})

const emailSuggestions = ref<string[]>([])
const showEmailSuggestions = ref(false)
const publicDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com']

const handleEmailInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value
  if (value.includes('@')) {
    const [prefix, domainPart] = value.split('@')
    emailSuggestions.value = publicDomains
      .filter(domain => domain.startsWith(domainPart))
      .map(domain => `${prefix}@${domain}`)
    
    showEmailSuggestions.value = emailSuggestions.value.length > 0
  } else {
    showEmailSuggestions.value = false
  }
}

const selectEmail = (selected: string) => {
  email.value = selected
  showEmailSuggestions.value = false
}

const hideEmailSuggestions = () => {
  setTimeout(() => {
    showEmailSuggestions.value = false
  }, 100)
}


const handleLogin = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  // Autocompletar formato colombiano (+57) si solo se escribieron los 10 dígitos numéricos
  let trimmedInput = email.value.trim();
  if (/^\d{10}$/.test(trimmedInput)) {
    trimmedInput = '+57' + trimmedInput;
    email.value = trimmedInput; // Actualiza el campo para evitar desajustes en el OTP
  }

  // Validación básica de formato
  const isPhone = email.value.startsWith('+') && !email.value.includes('@');

  loading.value = true

  // Si es login numérico, interceptamos para OTP (2FA)
  if (isPhone) {
    try {
      const resp = await fetch(`${getOtpUrl()}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email.value })
      });

      if (resp.ok) {
        showOtpStep.value = true;
        otpCode.value = ''; // Limpiar código previo si reintenta
        loading.value = false;
        startResendTimer();
        return; // Detenemos aquí, esperando validación visual OTP
      } else {
        errorMsg.value = 'Error al enviar WhatsApp. Comprueba tu conexión con la API de mensajes.';
        loading.value = false;
        return;
      }
    } catch (e) {
      errorMsg.value = 'Error de red contactando al servidor WhatsApp.';
      loading.value = false;
      return;
    }
  }

  // Si no es teléfono, entra directamente (Flujo normal correos)
  await processSupabaseLogin(false);
}

const openResetPassword = () => {
  errorMsg.value = ''
  successMsg.value = ''
  if (!email.value.includes('@')) {
    email.value = '' // Limpiar si es teléfono
  }
  showResetStep.value = true
}

const handleResetPassword = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  
  if (!email.value || !email.value.includes('@')) {
    errorMsg.value = "Ingresa un correo electrónico válido"
    return
  }

  loading.value = true
  // Enviamos correo usando la función estándar de supabase
  const redirectUrl = window.location.origin + '/reset-password'
  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: redirectUrl
  })

  loading.value = false

  if (error) {
    errorMsg.value = "Error enviando correo: " + error.message
  } else {
    successMsg.value = "Enlace enviado. Revisa la bandeja de entrada (y la de SPAM) de tu correo electrónico."
  }
}

const resendOtp = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    const resp = await fetch(`${getOtpUrl()}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: email.value })
    });
    if (resp.ok) {
      startResendTimer();
    } else {
      errorMsg.value = 'Error al reenviar WhatsApp. Comprueba tu conexión con la API de mensajes.';
    }
  } catch (e) {
    errorMsg.value = 'Error de red contactando al servidor WhatsApp.';
  }
  loading.value = false;
}

const handleVerifyOtp = async () => {
  errorMsg.value = ''
  loading.value = true

  try {
    const res = await fetch(`${getOtpUrl()}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email.value, code: otpCode.value })
    });
    
    if (res.ok) {
        // WhatsApp Correcto, desencadenamos sesión de Supabase
        await processSupabaseLogin(true);
    } else {
        errorMsg.value = 'Código inválido o expirado. Asegúrate de poner el último recibido.';
        loading.value = false;
    }
  } catch (e) {
      errorMsg.value = 'Fallo conectando al verificador de WhatsApp.';
      loading.value = false;
  }
}

// Embotellamos la lógica final de Supabase Auth para reusarla
const processSupabaseLogin = async (isPhoneLogin: boolean) => {
  const ghostEmail = email.value.replace(/\+/g, '') + "@viajejusto.whatsapp";
  
  const credentials = isPhoneLogin 
    ? { email: ghostEmail, password: password.value }
    : { email: email.value, password: password.value }

  const { data, error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    errorMsg.value = 'Credenciales o contraseña incorrectas.';
    // Si la clave estaba mal, lo devolvemos atrás
    if (showOtpStep.value) showOtpStep.value = false;
    loading.value = false;
    return;
  }

  if (data.user) {
    await authStore.fetchProfile(data.user.id)

    // Ruta de éxitos según rol
    loading.value = false;
    if (authStore.role === 'super_admin' || authStore.role === 'creator') {
      // Disparar Webhook silencioso al celular del Admin
      fetch(`${getOtpUrl()}/admin-login-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminEmail: email.value })
      }).catch(e => console.error("Webhook Admin falló", e));

      router.push('/dashboard-admin')
    } else {
      // Si viene de un link de invitación, volver al join
      if (pendingJoinTrip.value) {
        router.push(`/join/${pendingJoinTrip.value}`);
      } else {
        router.push('/dashboard-user')
      }
    }
  }
}
</script>

<style scoped>
.auth-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
}

.md-card {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  border-radius: 28px;
  width: 100%;
  max-width: 440px;
  padding: 40px 32px;
  box-shadow: var(--shadow-2);
}

.fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.md-card-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-tabs {
  display: flex;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 32px;
}

.tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  font-size: 14px;
  color: var(--md-sys-color-outline);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--md-sys-color-primary);
}

.subtitle {
  font-size: 14px;
  color: var(--md-sys-color-outline);
  margin: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
}

.full-width {
  width: 100%;
  margin-top: 16px;
  padding: 12px 24px;
  font-size: 16px;
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
  border-left: 4px solid #fff;
}

.md-card-footer {
  margin-top: 32px;
  text-align: center;
}

.body-text {
  font-size: 14px;
  color: var(--md-sys-color-on-surface);
  margin: 0;
}

.text-link {
  font-weight: 600;
  color: var(--md-sys-color-primary);
}

/* Autocomplete */
.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--md-sys-color-surface);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 8px;
  box-shadow: var(--shadow-2);
  list-style: none;
  padding: 8px 0;
  margin: 4px 0 0 0;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.autocomplete-dropdown li {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--md-sys-color-on-surface);
  transition: background 0.2s;
}

.autocomplete-dropdown li:hover {
  background: var(--md-sys-color-surface-container-high);
}
</style>
