import { ref, computed } from 'vue'

const LS_PROFILES = 'trello_profiles'
const LS_ACTIVE = 'trello_active_profile'
const LS_KEY_LEGACY = 'trello_key'
const LS_TOKEN_LEGACY = 'trello_token'
const LS_EXCLUDED_LEGACY = 'trello_excluded'

export interface Profile {
  id: string
  name: string
  key: string
  token: string
  excluded: string
}

export function useTaskProfiles() {
  const profiles = ref<Profile[]>([])
  const activeProfileId = ref('')

  const activeProfile = computed(() =>
    profiles.value.find(p => p.id === activeProfileId.value) ?? profiles.value[0]
  )
  const apiKey = computed(() => activeProfile.value?.key ?? '')
  const apiToken = computed(() => activeProfile.value?.token ?? '')
  const excludedBoards = computed(() =>
    (activeProfile.value?.excluded ?? '').split(',').map(s => s.trim()).filter(Boolean)
  )
  const hasCredentials = computed(() => !!(apiKey.value && apiToken.value))

  const showSettings = ref(false)

  function init(fromUrl?: string) {
    const stored = localStorage.getItem(LS_PROFILES)
    if (stored) {
      try { profiles.value = JSON.parse(stored) } catch {}
    }
    if (!profiles.value.length) {
      const key = localStorage.getItem(LS_KEY_LEGACY) || ''
      const token = localStorage.getItem(LS_TOKEN_LEGACY) || ''
      const excluded = localStorage.getItem(LS_EXCLUDED_LEGACY) || ''
      profiles.value = [{ id: '1', name: 'デフォルト', key, token, excluded }]
      localStorage.setItem(LS_PROFILES, JSON.stringify(profiles.value))
    }
    const fromStorage = localStorage.getItem(LS_ACTIVE)
    const preferred = fromUrl || fromStorage
    activeProfileId.value = (preferred && profiles.value.find(p => p.id === preferred))
      ? preferred
      : profiles.value[0].id
    localStorage.setItem(LS_ACTIVE, activeProfileId.value)
  }

  function openSettings() {
    showSettings.value = true
  }

  function applySettings(validProfiles: Profile[]) {
    profiles.value = validProfiles
    if (!profiles.value.find(p => p.id === activeProfileId.value)) {
      activeProfileId.value = profiles.value[0].id
    }
    localStorage.setItem(LS_PROFILES, JSON.stringify(profiles.value))
    localStorage.setItem(LS_ACTIVE, activeProfileId.value)
    showSettings.value = false
  }

  function switchProfile(id: string) {
    if (activeProfileId.value === id) return
    activeProfileId.value = id
    localStorage.setItem(LS_ACTIVE, id)
  }

  return {
    profiles, activeProfileId, activeProfile, apiKey, apiToken,
    excludedBoards, hasCredentials, showSettings,
    init, openSettings, applySettings, switchProfile,
  }
}
