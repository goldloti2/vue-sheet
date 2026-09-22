<script generic="Row extends { id: string }" lang="ts" setup>
  import type { RowGroup } from '@/schema/types'

  const props = withDefaults(defineProps<{
    groups: RowGroup<Row>[]
    path?: string
  }>(), {
    path: '',
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
  <v-list open-strategy="single">
    <template v-for="group in props.groups" :key="`${props.path}/${group.label}`">
      <v-list-group v-if="'subgroups' in group" :value="`${props.path}/${group.label}`">
        <template #activator="{ props: activatorProps }">
          <v-list-item v-bind="activatorProps" class="bg-surface-light" :title="`${group.label} (${countRows(group)})`" />
        </template>

        <GroupedList :groups="group.subgroups" :path="`${props.path}/${group.label}`">
          <template #default="slotProps">
            <slot v-bind="slotProps" />
          </template>
        </GroupedList>
      </v-list-group>

      <template v-else>
        <v-list-subheader class="bg-surface-light">{{ group.label }} ({{ group.rows.length }})</v-list-subheader>

        <template v-for="row in group.rows" :key="row.id">
          <slot :row="row" />
        </template>
      </template>
    </template>
  </v-list>
</template>
