<script generic="Row extends { id: string }" lang="ts" setup>
  import type { RowGroup } from '@/schema/group'
  import { computed, ref, watch } from 'vue'
  import CountLabel from '@/components/ui/list/CountLabel.vue'
  import ListLayout from '@/components/ui/list/ListLayout.vue'

  const props = withDefaults(defineProps<{
    groups: RowGroup<Row>[]
    path?: string
    // 每一組中各列的排法，分組列一律佔一整行（見 ListLayout）
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

  function valueOf (group: RowGroup<Row>): string {
    return `${props.path}/${group.label}`
  }

  // 這一層只有一組時固定展開、不可收合。組數改變時重新判斷
  const opened = ref<string[]>([])
  const locked = computed(() => {
    const [only, ...rest] = props.groups
    return only && rest.length === 0 && 'subgroups' in only ? valueOf(only) : null
  })
  watch(locked, value => {
    if (value !== null) {
      opened.value = [value]
    }
  }, { immediate: true })

  // 固定展開的那一組：移除切換用的點擊，分組列不再可點擊
  function headerProps (group: RowGroup<Row>, activatorProps: Record<string, unknown>) {
    return valueOf(group) === locked.value ? { ...activatorProps, onClick: undefined, link: false } : activatorProps
  }
</script>

<template>
  <v-list v-model:opened="opened" class="grouped-list" open-strategy="single">
    <template v-for="group in props.groups" :key="valueOf(group)">
      <v-list-group
        v-if="'subgroups' in group"
        :collapse-icon="valueOf(group) === locked ? '' : undefined"
        :value="valueOf(group)"
      >
        <template #activator="{ props: activatorProps }">
          <v-list-item v-bind="headerProps(group, activatorProps)" class="bg-surface-light">
            <template #title>
              <CountLabel :count="countRows(group)" :label="group.label" />
            </template>
          </v-list-item>
        </template>

        <GroupedList :groups="group.subgroups" :layout="props.layout" :path="valueOf(group)">
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
