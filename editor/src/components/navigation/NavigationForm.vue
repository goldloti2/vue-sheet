<script lang="ts" setup>
  import type { NavigationEdit, NavigationModel, NavItemInput, NavListRef } from '../../../shared/navigationForm'
  import { mdiPlus } from '@mdi/js'
  import { computed } from 'vue'
  import { editNavigation, parseNavigationText } from '@/api'
  import { useParsedForm } from '@/composables/useParsedForm'
  import { addDrawerItemEdits, BOTTOM_NAV_MAX, moveChoices, moveSectionEdits, NEW_NAV_ITEM, NEW_SECTION_TITLE } from '../../../shared/navigationForm'
  import NavItemList from './NavItemList.vue'
  import NavSectionHeader from './NavSectionHeader.vue'

  const props = defineProps<{
    path: string
    text: string
  }>()

  const form = useParsedForm({
    path: () => props.path,
    text: () => props.text,
    parse: parseNavigationText,
    edit: (text, edits: NavigationEdit[]) => editNavigation({ text, edits }),
  })

  const model = computed<NavigationModel | null | undefined>(() => form.model.value)
  const bottom: NavListRef = { list: 'navItems' }
  const drawerAt = (section: number): NavListRef => ({ list: 'drawer', section })

  function apply (edits: NavigationEdit[]): Promise<void> {
    return form.apply(edits)
  }

  // 清單的各項操作，at 為所在的清單
  function listHandlers (at: NavListRef) {
    return {
      reorder: (from: number, to: number) => apply([{ kind: 'moveItem', at, from, to }]),
      set: (index: number, name: keyof NavItemInput, value: string) => void apply([{ kind: 'setItem', at, index, name, value }]),
      remove: (index: number) => void apply([{ kind: 'removeItem', at, index }]),
      move: (index: number, option: number) => {
        const choice = model.value ? moveChoices(model.value, at)[option] : undefined
        if (choice && !choice.disabled) {
          void apply(choice.edits(index))
        }
      },
    }
  }

  const bottomFull = computed(() => (model.value?.navItems?.length ?? 0) >= BOTTOM_NAV_MAX)

  function addBottomItem (): void {
    void apply([{ kind: 'addItem', at: bottom, item: NEW_NAV_ITEM }])
  }

  function addDrawerItem (): void {
    if (model.value) {
      void apply(addDrawerItemEdits(model.value, NEW_NAV_ITEM))
    }
  }

  function addSection (): void {
    void apply([{ kind: 'addSection', index: model.value?.drawerSections?.length ?? 0, title: NEW_SECTION_TITLE }])
  }
</script>

<template>
  <div class="navigation-form editor-compact-inputs">
    <div v-if="model === undefined" class="text-medium-emphasis">讀取中</div>
    <div v-else-if="model === null" class="text-medium-emphasis">無法讀取 navigation.ts，請以其他編輯器修改</div>

    <template v-else>
      <section>
        <h3 class="navigation-form__title text-title-small">
          底部導覽列
          <span class="text-caption text-medium-emphasis">上限 {{ BOTTOM_NAV_MAX }} 項</span>
        </h3>

        <template v-if="model.navItems">
          <NavItemList
            :entries="model.navItems"
            :limit="BOTTOM_NAV_MAX"
            :move-options="moveChoices(model, bottom)"
            :reorder="listHandlers(bottom).reorder"
            :routes="model.routes"
            @move="listHandlers(bottom).move"
            @remove="listHandlers(bottom).remove"
            @set="listHandlers(bottom).set"
          />

          <v-btn
            v-if="!bottomFull"
            class="navigation-form__add"
            :prepend-icon="mdiPlus"
            size="small"
            text="新增項目"
            variant="text"
            @click="addBottomItem"
          />
        </template>

        <p v-else class="text-medium-emphasis">找不到 navItems 陣列，請以其他編輯器修改</p>
      </section>

      <section>
        <h3 class="navigation-form__title text-title-small">側邊欄</h3>

        <template v-if="model.drawerSections">
          <div v-for="(section, index) in model.drawerSections" :key="index" class="navigation-form__section">
            <template v-if="section.kind === 'section'">
              <NavSectionHeader
                v-if="section.title !== null"
                :first="index === 0"
                :icon="section.icon"
                :last="index === model.drawerSections.length - 1"
                :title="section.title"
                @down="apply(moveSectionEdits(model, index, 1))"
                @remove="apply([{ kind: 'removeSection', section: index }])"
                @set="(name, value) => apply([{ kind: 'setSection', section: index, name, value }])"
                @up="apply(moveSectionEdits(model, index, -1))"
              />

              <NavItemList
                v-if="section.items"
                :entries="section.items"
                :grouped="section.title !== null"
                :move-options="moveChoices(model, drawerAt(index))"
                :reorder="listHandlers(drawerAt(index)).reorder"
                :routes="model.routes"
                @move="listHandlers(drawerAt(index)).move"
                @remove="listHandlers(drawerAt(index)).remove"
                @set="listHandlers(drawerAt(index)).set"
              />

              <p v-else class="text-medium-emphasis">items 以程式碼寫成，請以其他編輯器修改</p>
            </template>

            <p v-else class="text-medium-emphasis">以程式碼寫成：{{ section.text }}</p>
          </div>

          <div class="navigation-form__actions">
            <v-btn
              :prepend-icon="mdiPlus"
              size="small"
              text="新增項目"
              variant="text"
              @click="addDrawerItem"
            />

            <v-btn
              :prepend-icon="mdiPlus"
              size="small"
              text="新增組"
              variant="text"
              @click="addSection"
            />
          </div>
        </template>

        <p v-else class="text-medium-emphasis">找不到 drawerSections 陣列，請以其他編輯器修改</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.navigation-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}

.navigation-form__title {
  margin-bottom: 8px;
}

.navigation-form__section {
  margin-bottom: 8px;
}

.navigation-form__actions {
  display: flex;
  gap: 8px;
}
</style>
