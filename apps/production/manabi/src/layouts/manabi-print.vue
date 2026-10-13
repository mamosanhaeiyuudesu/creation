<template>
  <div class="pr-root">
    <slot />
  </div>
</template>

<style>
/* 印刷・PDF用。ダークモードや方眼の背景は持ち込まず、常に白い紙として扱う。 */
.pr-root {
  min-height: 100dvh;
  color: #111;
  background: #e8e8e3;
  color-scheme: light;
  font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
@media print {
  .pr-root {
    background: #fff;
  }
}
</style>
