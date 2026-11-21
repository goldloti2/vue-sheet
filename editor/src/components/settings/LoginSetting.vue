<script lang="ts" setup>
  import type { LoginOption } from '../../../shared/appConfig'
  import type { ConfigValue } from '../../../shared/configGs'
  import { mdiAlertOutline } from '@mdi/js'
  import { computed } from 'vue'
  import { LOGIN_OPTIONS, loginOptionOf } from '../../../shared/appConfig'
  import SettingFallback from './SettingFallback.vue'

  const props = defineProps<{
    /** Config.gs 的 AUTH */
    auth: ConfigValue<string | null>
    /** app.ts 的 authMethod */
    authMethod: ConfigValue<string>
  }>()

  const emit = defineEmits<{
    select: [option: LoginOption]
  }>()

  // v-select 的值為選項的索引
  const items = LOGIN_OPTIONS.map((option, index) => ({ title: option.title, value: index }))

  const values = computed(() => props.auth?.kind === 'value' && props.authMethod?.kind === 'value'
    ? { auth: props.auth.value, authMethod: props.authMethod.value }
    : null)

  const selected = computed(() => {
    const option = values.value ? loginOptionOf(values.value.auth, values.value.authMethod) : null
    return option ? LOGIN_OPTIONS.indexOf(option) : null
  })

  const warning = computed(() => {
    if (!values.value || selected.value !== null) {
      return null
    }
    const auth = values.value.auth === null ? 'null' : `'${values.value.auth}'`
    return `Config.gs 的 AUTH 為 ${auth}，app.ts 的 authMethod 為 '${values.value.authMethod}'，兩者不是同一組。選擇登入方式後，兩邊一起修改。`
  })

  function select (index: number): void {
    emit('select', LOGIN_OPTIONS[index]!)
  }
</script>

<template>
  <div class="settings-grid">
    <span class="text-body-2">登入方式</span>

    <div v-if="values" class="login-setting">
      <v-select
        density="compact"
        hide-details
        :items="items"
        :model-value="selected"
        variant="outlined"
        @update:model-value="select"
      />

      <span v-if="warning" class="login-setting__warning">
        <v-icon :icon="mdiAlertOutline" size="16" />
        {{ warning }}
      </span>
    </div>

    <div v-else class="login-setting">
      <SettingFallback v-if="auth?.kind !== 'value'" file="Config.gs" name="AUTH" :value="auth" />
      <SettingFallback v-if="authMethod?.kind !== 'value'" file="app.ts" name="authMethod" :value="authMethod" />
    </div>
  </div>
</template>

<style scoped>
.login-setting {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-setting__warning {
  display: inline-flex;
  gap: 4px;
  align-items: flex-start;
  color: rgb(var(--v-theme-warning));
}
</style>
