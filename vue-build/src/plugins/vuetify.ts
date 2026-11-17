/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { darkColors, lightColors } from './colors'
// Styles
import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'system',
    // 主色的淡一階 primary-lighten-1，用於 FAB
    variations: { colors: ['primary'], lighten: 1, darken: 0 },
    themes: {
      light: { colors: lightColors },
      dark: { colors: darkColors },
    },
  },
  defaults: {
    // App Bar 的高度，外殼與表單頁共用（見 docs/design/README.md）
    VAppBar: { height: 58 },
    // 輸入框不顯示瀏覽器記住的輸入紀錄。登入頁的帳號與密碼另行指定
    VAutocomplete: { autocomplete: 'off' },
    VCombobox: { autocomplete: 'off' },
    VDateInput: { autocomplete: 'off' },
    VNumberInput: { autocomplete: 'off' },
    VTextarea: { autocomplete: 'off' },
    VTextField: { autocomplete: 'off' },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})
