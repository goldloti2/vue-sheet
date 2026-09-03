<!-- 複製到 src/pages/__table__/index.vue -->
<route lang="json5">
{ meta: { title: '範本' } }
</route>

<script lang="ts" setup>
  import type { __Table__Row } from '@/schema/__table__'
  import DataList from '@/components/ui/DataList.vue'
  import PageFab from '@/components/ui/PageFab.vue'
  import { use__Table__Actions } from '@/composables/actions/use__Table__Actions'
  import { useSortedTableList } from '@/composables/useSortedTableList'
  import { __table__Schema } from '@/schema/__table__'
  import { formatField } from '@/schema/types'

  const { new: newAction } = use__Table__Actions()
  const fabActions = [newAction]

  const { data, loading, error } = useSortedTableList<__Table__Row>('__table__', __table__Schema)
</script>

<template>
  <div>
    <v-container>
      <v-progress-linear v-if="loading" indeterminate />

      <v-alert v-else-if="error" :text="error" type="error" />

      <template v-if="!error">
        <DataList
          v-for="row in data"
          :key="row.id"
          :bottom-left="formatField(row, __table__Schema, 'amount')"
          :title="formatField(row, __table__Schema, 'name')"
          :to="`/__table__/${row.id}`"
          :top-right="formatField(row, __table__Schema, 'date')"
        />
      </template>
    </v-container>

    <PageFab :actions="fabActions" />
  </div>
</template>
