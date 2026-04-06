import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'
import type { User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const role = ref<string | null>(null)
  const isInitialized = ref(false)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (data) {
      role.value = data.role
    } else {
      if (error) console.error('Error fetching profile:', error.message)
      // Fallback para usuarios que no tienen perfil en la BD aún
      role.value = 'usuario'
    }
  }

  const initializeSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user.value = session.user
      await fetchProfile(session.user.id)
    }
    isInitialized.value = true

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        user.value = session.user
        await fetchProfile(session.user.id)
      } else {
        user.value = null
        role.value = null
      }
    })
  }

  return { user, role, isInitialized, initializeSession, fetchProfile }
})
