<template>
  <div class="app-wrapper">
    <!-- Global Theme Toggle -->
    <button class="theme-toggle" @click="toggleTheme" aria-label="Cambiar tema">
      <span v-if="isDark" class="icon">☀️</span>
      <span v-else class="icon">🌙</span>
    </button>

    <div v-if="authStore.isInitialized">
      <router-view></router-view>
    </div>
    <div v-else class="loading-screen">
      <div class="md-spinner"></div>
      <p>Cargando aplicación...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()
const isDark = ref(false)

const applyTheme = (dark: boolean) => {
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  applyTheme(isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
  } else {
    isDark.value = false
  }
  applyTheme(isDark.value)
})
</script>

<style>
.app-wrapper {
  position: relative;
  min-height: 100vh;
}

.theme-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface);
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-1);
  transition: transform 0.2s, box-shadow 0.2s;
  font-size: 20px;
}

.theme-toggle:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-2);
}

.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: var(--md-sys-color-on-background);
}

.md-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--md-sys-color-primary-container);
  border-top-color: var(--md-sys-color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 24px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
