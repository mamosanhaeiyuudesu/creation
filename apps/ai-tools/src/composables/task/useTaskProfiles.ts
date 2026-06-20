import { ref, computed } from 'vue'

const LS_ACTIVE = 'trello_active_profile'

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

  async function init(fromUrl?: string) {
    try {
      const fetched = await $fetch<Profile[]>('/api/task/profiles')
      profiles.value = fetched
    } catch {
      profiles.value = []
    }

    const fromStorage = localStorage.getItem(LS_ACTIVE)
    const preferred = fromUrl || fromStorage
    activeProfileId.value = (preferred && profiles.value.find(p => p.id === preferred))
      ? preferred
      : (profiles.value[0]?.id ?? '')
    if (activeProfileId.value) localStorage.setItem(LS_ACTIVE, activeProfileId.value)
  }

  function openSettings() {
    showSettings.value = true
  }

  async function applySettings(validProfiles: Profile[]) {
    profiles.value = validProfiles
    if (!profiles.value.find(p => p.id === activeProfileId.value)) {
      activeProfileId.value = profiles.value[0]?.id ?? ''
    }
    localStorage.setItem(LS_ACTIVE, activeProfileId.value)
    await $fetch('/api/task/profiles', {
      method: 'PUT',
      body: { profiles: validProfiles },
    })
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
