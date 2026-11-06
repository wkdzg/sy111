<script setup>
import { computed } from 'vue'
import { Search, RefreshLeft } from '@element-plus/icons-vue'
import { listStore } from '@/store'
import SearchFaceIcon from '@/components/SearchFaceIcon.vue'

const emit = defineEmits(['search'])

const meta = computed(() => listStore.meta)
const fields = computed(() => meta.value?.searchFields || [])

/** 列宽由 categoryMeta 里的 flex 提示决定，最后固定一列放搜索按钮 */
const gridTemplate = computed(() => {
  const cols = fields.value.map((f) => `minmax(0, ${f.flex || 1}fr)`)
  return [...cols, '120px'].join(' ')
})

function submit() {
  emit('search')
}

function resetAndSearch() {
  listStore.resetAll()
  emit('search')
}
</script>

<template>
  <div class="searchlist" :style="{ gridTemplateColumns: gridTemplate }">
    <div class="searchlist-item" v-for="(field, index) in fields" :key="field.key">
      <div class="search-box">
        <label :for="`sf-${field.key}`">{{ field.label }}</label>

        <el-date-picker
          v-if="field.type === 'daterange'"
          v-model="listStore.form[field.key]"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :teleported="false"
        />

        <el-date-picker
          v-else-if="field.type === 'date'"
          v-model="listStore.form[field.key]"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          :teleported="false"
        />

        <input
          v-else
          :id="`sf-${field.key}`"
          type="text"
          v-model="listStore.form[field.key]"
          :placeholder="field.placeholder || ''"
          @keyup.enter="submit"
        />
      </div>

      <!-- 第一个格子里塞一个"重置"，省得用户填完找不到清空入口 -->
      <button
        v-if="index === 0"
        type="button"
        class="search-reset"
        title="重置搜索条件"
        @click="resetAndSearch"
      >
        <el-icon><refresh-left /></el-icon>
      </button>
    </div>

    <div class="searchlist-item searchlist-submit">
      <el-button type="primary" :icon="SearchFaceIcon" :loading="listStore.loading" @click="submit" />
    </div>
  </div>
</template>

<style scoped>
.search-reset {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 22px;
  height: 22px;
  display: none;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}
.searchlist-item:hover .search-reset {
  display: inline-flex;
  animation: pop-in 0.24s ease both;
}
.search-reset:hover {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  transform: rotate(-90deg);
}
.searchlist-submit {
  border-left: none;
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
