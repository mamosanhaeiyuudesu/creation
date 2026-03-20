<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: radial-gradient(circle at 20% 20%, #0f172a 0, #020617 45%);
  color: #e2e8f0;
}

#__nuxt {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
