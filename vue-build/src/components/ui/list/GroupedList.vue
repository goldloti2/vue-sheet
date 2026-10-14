<script generic="Row extends { id: string }" lang="ts" setup>
  import type { RowGroup } from '@/schema/group'
  import CountLabel from '@/components/ui/list/CountLabel.vue'
  import ListLayout from '@/components/ui/list/ListLayout.vue'

  const props = withDefaults(defineProps<{
    groups: RowGroup<Row>[]
    path?: string
    // 每組底下各筆的排法；組的標題一律佔一整行（見 ListLayout）
    layout?: 'list' | 'grid'
  }>(), {
    path: '',
    layout: 'list',
  })

  defineSlots<{
    default: (props: { row: Row }) => unknown
  }>()

  function countRows (group: RowGroup<Row>): number {
    return 'subgroups' in group
      ? group.subgroups.reduce((total, subgroup) => total + countRows(subgroup), 0)
      : group.rows.length
  }
</script>

<template>
  <v-list class="grouped-list" open-strategy="single">
    <template v-for="group in props.groups" :key="`${props.path}/${group.label}`">
      <v-list-group v-if="'subgroups' in group" :value="`${props.path}/${group.label}`">
        <template #activator="{ props: activatorProps }">
          <v-list-item v-bind="activatorProps" class="bg-surface-light">
            <template #title>
              <CountLabel :count="countRows(group)" :label="group.label" />
            </template>
          </v-list-item>
        </template>

        <GroupedList :groups="group.subgroups" :layout="props.layout" :path="`${props.path}/${group.label}`">
          <template #default="slotProps">
            <slot v-bind="slotProps" />
          </template>
        </GroupedList>
      </v-list-group>

      <template v-else>
        <!-- label 為 null 的子組沒有標題，直接列出各列（見 GroupLevel 的 label） -->
        <v-list-subheader v-if="group.label !== null" class="bg-surface-light">
          <CountLabel :count="group.rows.length" :label="group.label" />
        </v-list-subheader>

        <ListLayout :layout="props.layout">
          <template v-for="row in group.rows" :key="row.id">
            <slot :row="row" />
          </template>
        </ListLayout>
      </template>
    </template>
  </v-list>
</template>

<style scoped>
/* v-list 預設 overflow: auto，會裁切 profile、card、gallery 往右下的陰影；巢狀的各層皆適用 */
.grouped-list {
  overflow: visible;
}

/* 展開與收合的動畫期間，Vuetify 會於此層暫設 overflow: hidden。左右各外擴陰影的範圍再以內距抵銷，
   內容的位置與寬度不變，裁切範圍則涵蓋陰影 */
.grouped-list :deep(.v-list-group__items) {
  margin-inline: calc(-1 * var(--list-card-shadow-extent));
  padding-inline: var(--list-card-shadow-extent);
}
</style>
