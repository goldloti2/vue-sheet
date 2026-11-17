import type { SchemaTypes } from '../../shared/schema'
import { useTheme } from 'vuetify'

// 共用色名（ColorName，例如 red）於目前主題的色值，與 vue-build 的主題相同。沒有色值時為 undefined
export function useColorValue (types: () => SchemaTypes | null) {
  const theme = useTheme()
  return (name: string | null): string | undefined => {
    const colors = types()?.colors
    if (!name || !colors) {
      return undefined
    }
    return (theme.current.value.dark ? colors.dark : colors.light)[`vuesheet-${name}`]
  }
}
