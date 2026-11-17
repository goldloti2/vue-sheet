<template>
  <section class="preview-pane">
    <v-toolbar color="surface" density="compact" title="預覽" />

    <div class="preview-pane__body text-medium-emphasis">
      預覽尚未啟動
    </div>
  </section>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-pane__body {
  margin: auto;
}
</style>
