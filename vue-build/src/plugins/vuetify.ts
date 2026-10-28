/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import colors from 'vuetify/util/colors'
// Styles
import 'vuetify/styles'

// 共用的色名，淺色主題較深，深色主題較淺（見 docs/components/view/FormattedValue.md）。只有淺色的黃色不在色板上
const lightColors = {
  'vuesheet-red': colors.red.darken3,
  'vuesheet-orange': colors.orange.darken4,
  'vuesheet-yellow': '#a58a08',
  'vuesheet-green': colors.green.darken3,
  'vuesheet-blue': colors.blue.darken3,
  'vuesheet-purple': colors.purple.darken3,
  'vuesheet-grey': colors.grey.darken2,
}

const darkColors = {
  'vuesheet-red': colors.red.lighten3,
  'vuesheet-orange': colors.orange.lighten1,
  'vuesheet-yellow': colors.yellow.accent4,
  'vuesheet-green': colors.green.lighten2,
  'vuesheet-blue': colors.blue.lighten3,
  'vuesheet-purple': colors.purple.lighten4,
  'vuesheet-grey': colors.grey.lighten1,
}

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'system',
    themes: {
      light: { colors: lightColors },
      dark: { colors: darkColors },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})
