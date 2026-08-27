<script lang="ts" setup>
  import type { TemplateRow } from '@/schema/template'
  import type { GroupLevel } from '@/schema/types'
  import { computed } from 'vue'
  import GroupedList from '@/components/ui/GroupedList.vue'
  import ListItem from '@/components/ui/ListItem.vue'
  import { useSortedTableList } from '@/composables/useSortedTableList'
  import { templateSchema } from '@/schema/template'
  import { formatField, groupRows } from '@/schema/types'

  const { data, loading, error } = useSortedTableList<TemplateRow>('template', templateSchema)

  const groupLevels: GroupLevel<TemplateRow>[] = [
    {
      sortKey: row => row.date?.getTime() ?? 0,
      label: row => row.date?.getTime() ? '1' : '0',
    },
    {
      sortKey: row => row.number ?? 0,
      label: row => row.number ? '1' : '0',
    },
  ]

  const groupedData = computed(() => groupRows(data.value, groupLevels))
</script>

<template>
  <div>
    <v-container>
      <v-progress-circular v-if="loading" indeterminate />

      <v-alert v-else-if="error" :text="error" type="error" />

      <GroupedList v-else :groups="groupedData">
        <template #default="{ row }">
          <ListItem
            :key="row.id"
            :bottom-left="formatField(row, templateSchema, 'status')"
            :bottom-right="formatField(row, templateSchema, 'number')"
            :title="row.id"
            :to="`/template/${row.id}`"
            :top-right="formatField(row, templateSchema, 'date')"
          />
        </template>
      </GroupedList>
    </v-container>
  </div>
</template>
