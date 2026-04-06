<template>
  <div class="auth-wrapper">
    <div class="md-card elevate-2 fade-in">
      <div class="md-card-header">
        <h1 class="title">Crear Cuenta</h1>
        <p class="subtitle">Únete a Viaje Justo</p>
      </div>


      <!-- Pantalla de OTP -->
      <form v-if="showOtpStep" @submit.prevent="handleVerifyOtp" class="auth-form fade-in">
        <p class="body-text" style="text-align: center; margin-bottom: 16px;">
          Ingresa el código que hemos enviado por correo electrónico a<br>
          <strong>{{ form.email }}</strong>
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
          {{ loading ? 'Verificando...' : 'Verificar y Entrar' }}
        </button>

        <button 
          v-if="showOtpStep"
          type="button" 
          @click="resendOtp" 
          :disabled="resendTimer > 0 || loading" 
          class="md-btn full-width" 
          style="margin-top: 8px; background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);"
        >
          {{ resendTimer > 0 ? `Reenviar código en ${resendTimer}s` : 'Reenviar código' }}
        </button>

        <button type="button" @click="showOtpStep = false" class="md-btn text full-width" style="margin-top: 8px; background: transparent; color: var(--md-sys-color-primary);">
          Volver
        </button>
      </form>

      <!-- Formulario de Registro Principal -->
      <form v-else @submit.prevent="handleSignup" class="auth-form">
        <!-- Nombre y Apellido -->
        <div class="form-row">
          <div class="md-input-group half">
            <input id="nombre" type="text" v-model="form.nombre" class="md-input" placeholder=" " required />
            <label for="nombre" class="md-label">Nombres</label>
          </div>
          <div class="md-input-group half">
            <input id="apellido" type="text" v-model="form.apellido" class="md-input" placeholder=" " required />
            <label for="apellido" class="md-label">Apellidos</label>
          </div>
        </div>

        <!-- Identificación -->
        <div class="md-input-group">
          <input id="identificacion" type="text" v-model="form.identificacion" class="md-input" placeholder=" " required />
          <label for="identificacion" class="md-label">Número de Identificación</label>
        </div>

        <!-- Teléfono -->
        <div class="form-row phone-row">
          <div class="md-input-group prefix">
            <select id="codigo_pais" v-model="form.codigo_pais" class="md-input" required>
              <option value="+57">🇨🇴 +57</option>
              <option value="+52">🇲🇽 +52</option>
              <option value="+54">🇦🇷 +54</option>
              <option value="+56">🇨🇱 +56</option>
              <option value="+58">🇻🇪 +58</option>
              <option value="+51">🇵🇪 +51</option>
              <option value="+34">🇪🇸 +34</option>
              <option value="+1">🇺🇸 +1</option>
            </select>
          </div>
          <div class="md-input-group flex-1">
            <input id="telefono" type="tel" v-model="form.telefono" class="md-input" placeholder=" " required />
            <label for="telefono" class="md-label">Teléfono Móvil (WhatsApp)</label>
          </div>
        </div>

        <!-- Verificación del número de WhatsApp - siempre visible -->
        <div class="wa-verify-block">
          <!-- Casilla del código -->
          <div class="md-input-group" style="margin-bottom: 12px;">
            <input 
              id="phone_otp" 
              type="text" 
              v-model="phoneVerifCode" 
              class="md-input" 
              placeholder=" " 
              maxlength="6"
              :disabled="!phoneVerifSent"
              style="text-align: center; letter-spacing: 4px; font-weight: bold; font-size: 20px;"
            />
            <label for="phone_otp" class="md-label">Código de verificación (WhatsApp)</label>
          </div>

          <!-- Botón verificar código (aparece cuando hay código escrito) -->
          <button
            v-if="phoneVerifCode.length === 6 && !phoneVerified"
            type="button"
            @click="verifyPhoneCode"
            :disabled="loadingVerif"
            class="md-btn btn-verify-code"
          >
            {{ loadingVerif ? 'Verificando...' : '✅ Verificar Código' }}
          </button>
          <div v-if="phoneVerified" class="verified-badge">
            ✅ Número verificado correctamente
          </div>

          <!-- Botón enviar/reenviar y temporizador -->
          <div class="wa-send-row" style="margin-top: 10px;">
            <button 
              type="button" 
              @click="sendPhoneVerification" 
              :disabled="loadingVerif || (phoneVerifSent && phoneVerifTimer > 0)"
              class="md-btn btn-wa-send"
            >
              {{ loadingVerif ? 'Enviando...' : (phoneVerifSent ? '📱 Reenviar código' : '📱 Verificar Número') }}
            </button>
            <span v-if="phoneVerifTimer > 0" class="verif-timer">
              ⏳ Reenviar en <strong>{{ phoneVerifTimer }}s</strong>
            </span>
            <span v-else-if="!phoneVerifSent" class="verif-hint">
              Envía un código para autenticar tu número
            </span>
          </div>
        </div>

        <!-- Rol / Tipo de Cuenta -->
        <div class="md-input-group">
          <select id="role" v-model="form.role" class="md-input" required style="padding-left: 8px;">
            <option value="Individual">👤 Viajero Individual</option>
            <option value="Grupal">👥 Coordinador de Viaje Grupal</option>
          </select>
          <label for="role" class="md-label">Tipo de Cuenta (Propósito Principal)</label>
        </div>

        <!-- Correo -->
        <div class="md-input-group" style="position: relative;">
          <input 
            id="email" 
            type="email" 
            v-model="form.email" 
            @input="handleEmailInput"
            @focus="showEmailSuggestions = emailSuggestions.length > 0"
            @blur="hideEmailSuggestions"
            class="md-input" 
            placeholder=" " 
            required 
          />
          <label for="email" class="md-label">Correo electrónico</label>
          
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
        
        <!-- Contraseña -->
        <div class="md-input-group" style="margin-bottom: 8px;">
          <input 
            id="password" 
            type="password" 
            v-model="form.password" 
            class="md-input" 
            placeholder=" " 
            required 
          />
          <label for="password" class="md-label">Contraseña</label>
        </div>
        
        <p class="pwd-hint"> Mínimo 12 caracteres, incluir letras y un símbolo (por ej: .,#@).</p>

        <div v-if="errorMsg" class="error-msg" style="margin-top: 16px;">
          <span class="icon">⚠️</span> {{ errorMsg }}
        </div>
        
        <div v-if="successMsg" class="success-msg" style="margin-top: 16px;">
          <span class="icon">✅</span> {{ successMsg }}
        </div>

        <button type="submit" :disabled="loading || !phoneVerified" class="md-btn full-width" style="margin-top: 16px;">
          <span v-if="!phoneVerified">🔒 Verifica tu número para continuar</span>
          <span v-else>{{ loading ? 'Procesando...' : 'Registrarse' }}</span>
        </button>
      </form>
      
      <div class="md-card-footer" v-if="!showOtpStep">
        <p class="body-text">
          ¿Ya tienes cuenta? <router-link :to="pendingJoinTrip ? `/?joinTrip=${pendingJoinTrip}` : '/'" class="text-link">Inicia sesión</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const route = useRoute()

// Si venimos de un link de invitación, guardamos el tripId para redirigir al join después
const pendingJoinTrip = computed(() => route.query.joinTrip as string | undefined)
const showOtpStep = ref(false)
const otpCode = ref('')
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

const form = ref({
  nombre: '',
  apellido: '',
  identificacion: '',
  codigo_pais: '+57',
  telefono: '',
  email: '',
  password: '',
  role: 'Individual'
})

const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// Estado para verificación inline de WhatsApp
const phoneVerifSent = ref(false)
const phoneVerifCode = ref('')
const phoneVerified = ref(false)
const loadingVerif = ref(false)
const phoneVerifTimer = ref(0)
let phoneVerifInterval: any = null

const startPhoneVerifTimer = () => {
  phoneVerifTimer.value = 60
  if (phoneVerifInterval) clearInterval(phoneVerifInterval)
  phoneVerifInterval = setInterval(() => {
    if (phoneVerifTimer.value > 0) {
      phoneVerifTimer.value--
    } else {
      clearInterval(phoneVerifInterval)
      phoneVerifSent.value = false // Permite reenviar
    }
  }, 1000)
}

const sendPhoneVerification = async () => {
  if (!form.value.telefono) return
  loadingVerif.value = true
  errorMsg.value = ''
  try {
    const resp = await fetch(`${getOtpUrl()}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhoneNumber.value, isSignup: true })
    })
    if (resp.ok) {
      phoneVerifSent.value = true
      phoneVerified.value = false
      phoneVerifCode.value = '' // Limpiar si reenvía
      startPhoneVerifTimer()
    } else {
      errorMsg.value = 'Error al enviar código WhatsApp. Verifica el número.'
    }
  } catch (e) {
    errorMsg.value = 'Error de red al contactar servidor WhatsApp.'
  }
  loadingVerif.value = false
}

// Verificar el código escrito contra el servidor
const verifyPhoneCode = async () => {
  if (phoneVerifCode.value.length !== 6) return
  loadingVerif.value = true
  errorMsg.value = ''
  try {
    const res = await fetch(`${getOtpUrl()}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhoneNumber.value, code: phoneVerifCode.value })
    })
    if (res.ok) {
      phoneVerified.value = true
      // Detener el timer ya que ya se verificó
      if (phoneVerifInterval) clearInterval(phoneVerifInterval)
      phoneVerifTimer.value = 0
    } else {
      errorMsg.value = 'Código incorrecto o expirado. Solicita uno nuevo.'
      phoneVerifCode.value = ''
    }
  } catch (e) {
    errorMsg.value = 'Error de conexión al verificar el código.'
  }
  loadingVerif.value = false
}

// --- Lógica Autocompletar Email ---
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

const selectEmail = (email: string) => {
  form.value.email = email
  showEmailSuggestions.value = false
}

const hideEmailSuggestions = () => {
  // Pequeño timeout para permitir que el click se registre en el li
  setTimeout(() => {
    showEmailSuggestions.value = false
  }, 100)
}


const validatePassword = (pwd: string) => {
  // Mínimo 12 caracteres, al menos una letra, al menos un carácter no alfanumérico (ej: .,\/#)
  const regex = /^(?=.*[a-zA-Z])(?=.*[^a-zA-Z0-9]).{12,}$/
  return regex.test(pwd)
}


const fullPhoneNumber = computed(() => {
  const cleanNumber = form.value.telefono.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return `${form.value.codigo_pais}${cleanNumber}`
})

const getOtpUrl = () => {
  return import.meta.env.VITE_OTP_SERVER_URL || 'https://otp-ws.viaje-justo.xyz';
}

// --- Controladores ---
const handleSignup = async () => {
  errorMsg.value = ''
  successMsg.value = ''

  if (!validatePassword(form.value.password)) {
    errorMsg.value = 'La contraseña debe tener mínimo 12 caracteres, contener texto y un símbolo (#,.,-, etc).'
    return
  }

  if (!phoneVerified.value) {
    errorMsg.value = 'Debes verificar tu número de WhatsApp antes de continuar.'
    return
  }

  loading.value = true


  try {
    const resp = await fetch(`${getOtpUrl()}/request-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.value.email, phone: form.value.telefono, isSignup: true })
    });

    if (resp.ok) {
      successMsg.value = 'Te hemos enviado un código secreto a tu correo.'
      showOtpStep.value = true
      startResendTimer()
    } else {
      errorMsg.value = 'Error al generar el correo de verificación.';
    }
  } catch (err) {
    errorMsg.value = "Fallo de conexión al servidor de códigos. Revisa red.";
    console.error(err);
  }

  loading.value = false
}

const resendOtp = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    const resp = await fetch(`${getOtpUrl()}/request-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.value.email, phone: form.value.telefono, isSignup: true })
    });
    if (resp.ok) {
      startResendTimer();
    } else {
      errorMsg.value = 'Error al reenviar el código. Intenta nuevamente.';
    }
  } catch (e) {
    errorMsg.value = 'Error de red contactando al servidor.';
  }
  loading.value = false;
}

const handleVerifyOtp = async () => {
  errorMsg.value = ''
  loading.value = true

  try {
    const metaData = {
      nombre: form.value.nombre,
      apellido: form.value.apellido,
      identificacion: form.value.identificacion,
      codigo_pais: form.value.codigo_pais,
      telefono: form.value.telefono,
      role: form.value.role
    }

    const adminRes = await fetch(`${getOtpUrl()}/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: form.value.email,
            code: otpCode.value,
            password: form.value.password,
            metaData: metaData
        })
    });
    
    const adminData = await adminRes.json();
    
    if (adminRes.ok) {
        // Usuario creado y confirmado, iniciamos sesión
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: form.value.email,
            password: form.value.password
        });
        
        if (loginError) {
            errorMsg.value = "Auth Signin: " + loginError.message;
        } else {
            // Si vino de un link de invitación, regresar al join en vez del dashboard
            if (pendingJoinTrip.value) {
                router.push(`/join/${pendingJoinTrip.value}`);
            } else {
                router.push('/dashboard-user');
            }
        }
    } else {
        // Si el correo ya estaba registrado pero el OTP pasó, lanzará error aquí.
        errorMsg.value = "Error validando cuenta: " + (adminData.error || adminData.msg);
    }
  } catch (e) {
      errorMsg.value = 'Fallo crítico contactando al verificador.';
  }
  loading.value = false
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
  max-width: 500px;
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

.title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--md-sys-color-primary);
}

.subtitle {
  font-size: 16px;
  color: var(--md-sys-color-outline);
  margin: 0;
}

/* Tabs */
.login-tabs {
  display: flex;
  background-color: var(--md-sys-color-surface-container);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
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

.auth-form {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  gap: 16px;
  width: 100%;
}

.half {
  flex: 1;
  max-width: 50%;
}

.phone-row .prefix {
  width: 120px;
  flex-shrink: 0;
}

.phone-row .flex-1 {
  flex: 1;
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

.pwd-hint {
  font-size: 12px;
  color: var(--md-sys-color-outline);
  margin: 0;
}

.full-width {
  width: 100%;
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
  font-size: 14px;
}

.success-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--md-sys-color-success);
  color: var(--md-sys-color-surface);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
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

select.md-input {
  appearance: none;
  cursor: pointer;
  padding-left: 8px;
}

/* Bloque de verificación inline de WhatsApp */
.wa-verify-block {
  background: var(--md-sys-color-surface-container);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--md-sys-color-outline-variant);
}

.wa-send-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-wa-send {
  background: linear-gradient(135deg, #25d366, #128c7e);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-wa-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.verif-timer {
  font-size: 13px;
  color: var(--md-sys-color-outline);
  font-weight: 500;
}

.verif-hint {
  font-size: 13px;
  color: var(--md-sys-color-outline);
  font-style: italic;
}

.wa-verify-block .md-input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-verify-code {
  width: 100%;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 10px;
  transition: opacity 0.2s, transform 0.1s;
}
.btn-verify-code:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.01);
}
.btn-verify-code:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.verified-badge {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid #22c55e;
  color: #22c55e;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  margin-bottom: 10px;
}
</style>
