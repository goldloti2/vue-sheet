<script lang="ts" setup>
  import type { AppConfigEdit, LoginOption } from '../../../shared/appConfig'
  import type { ConfigEdit } from '../../../shared/configGs'
  import { computed } from 'vue'
  import { editAppConfig, editConfig, parseAppConfigText, parseConfigText } from '@/api'
  import { useParsedForm } from '@/composables/useParsedForm'
  import { useFilesStore } from '@/stores/files'
  import { APP_CONFIG_FILE } from '../../../shared/appConfig'
  import { CONFIG_FILE } from '../../../shared/configGs'
  import AppSettings from './AppSettings.vue'
  import BackendSettings from './BackendSettings.vue'
  import LoginSetting from './LoginSetting.vue'

  const files = useFilesStore()

  // 設定頁同時修改 app.ts 與 Config.gs，兩個檔案各自解析
  const appForm = useParsedForm({
    path: () => APP_CONFIG_FILE,
    text: () => files.textOf(APP_CONFIG_FILE) ?? '',
    parse: parseAppConfigText,
    edit: (text, edits: AppConfigEdit[]) => editAppConfig({ text, edits }),
  })

  const configForm = useParsedForm({
    path: () => CONFIG_FILE,
    text: () => files.textOf(CONFIG_FILE) ?? '',
    parse: parseConfigText,
    edit: (text, edits: ConfigEdit[]) => editConfig({ text, edits }),
  })

  const hasApp = computed(() => files.paths.includes(APP_CONFIG_FILE))
  const hasConfig = computed(() => files.paths.includes(CONFIG_FILE))
  const appModel = computed(() => hasApp.value ? appForm.model.value : null)
  const configModel = computed(() => hasConfig.value ? configForm.model.value : null)
  const loading = computed(() => appModel.value === undefined || configModel.value === undefined)

  function applyApp (edits: AppConfigEdit[]): void {
    void appForm.apply(edits)
  }

  function applyConfig (edits: ConfigEdit[]): void {
    void configForm.apply(edits)
  }

  // 登入方式一次寫入兩個檔案
  function selectLogin (option: LoginOption): void {
    applyApp([{ name: 'authMethod', value: option.authMethod }])
    applyConfig([{ kind: 'setAuth', value: option.auth }])
  }
</script>

<template>
  <div class="settings-page editor-compact-inputs">
    <div v-if="loading" class="text-medium-emphasis">讀取中</div>

    <template v-else>
      <section>
        <h3 class="settings-page__title text-title-small">App</h3>

        <AppSettings v-if="appModel" :model="appModel" @edit="applyApp" />
        <p v-else class="text-medium-emphasis">無法讀取 {{ APP_CONFIG_FILE }}，請以其他編輯器修改</p>
      </section>

      <section>
        <h3 class="settings-page__title text-title-small">登入</h3>

        <LoginSetting
          v-if="appModel && configModel"
          :auth="configModel.auth"
          :auth-method="appModel.authMethod"
          @select="selectLogin"
        />

        <p v-else class="text-medium-emphasis">須同時讀得到 {{ APP_CONFIG_FILE }} 與 {{ CONFIG_FILE }}</p>
      </section>

      <section>
        <h3 class="settings-page__title text-title-small">後端</h3>

        <BackendSettings v-if="configModel" :model="configModel" @edit="applyConfig" />
        <p v-else class="text-medium-emphasis">無法讀取 {{ CONFIG_FILE }}，請以其他編輯器修改</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}

.settings-page__title {
  margin-bottom: 8px;
}

/* 子元件的根節點：名稱與輸入框兩欄 */
.settings-grid {
  display: grid;
  grid-template-columns: 160px minmax(0, 240px);
  gap: 4px 12px;
  align-items: center;
}
</style>
