<script setup>
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { listStore } from '@/store'

const emit = defineEmits(['change'])

const meta = computed(() => listStore.meta)
const groups = computed(() => meta.value?.filterGroups || [])
const sorts = computed(() => meta.value?.sorts || [])

const currentSortLabel = computed(() => {
  const hit = sorts.value.find((item) => item.key === listStore.sort)
  return hit ? hit.label : '推荐排序'
})

/** 多选下拉的触发器文案 */
function summaryOf(group) {
  const values = listStore.filters[group.key] || []
  if (!values.length) return '不限'
  if (values.length === 1) return values[0]
  return `已选 ${values.length} 项`
}

const pickedCount = (group) => (listStore.filters[group.key] || []).length

function change() {
  emit('change')
}

function pickSingle(group, option) {
  listStore.setSingleFilter(group.key, option.value)
  change()
}

function pickMulti(group, option) {
  listStore.toggleFilter(group.key, option.value)
  change()
}

function pickSort(key) {
  listStore.setSort(key)
  change()
}

function clearAll() {
  listStore.resetFilters()
  change()
}
</script>

<template>
  <div class="filter-panel">
    <div class="filter-toolbar">
      <span class="filter-toolbar-title">
        筛选条件
        <em v-if="listStore.activeFilterCount" class="picked-badge">
          已选 {{ listStore.activeFilterCount }} 项
        </em>
      </span>

      <div class="filter-toolbar-actions">
        <el-dropdown @command="pickSort">
          <span class="el-dropdown-link">
            {{ currentSortLabel }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="item in sorts" :key="item.key" :command="item.key">
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-link
          type="primary"
          :underline="false"
          :disabled="!listStore.activeFilterCount"
          @click="clearAll"
        >
          清空筛选
        </el-link>
      </div>
    </div>

    <div class="topfilter">
      <div v-for="group in groups" :key="group.key" class="filter-group">
        <h5>{{ group.title }}</h5>

        <div class="topfilter-price">
          <!-- 单选：按钮组 -->
          <template v-if="group.type === 'single'">
            <el-button
              v-for="option in group.options"
              :key="option.value"
              :type="listStore.hasFilter(group.key, option.value) ? 'primary' : 'info'"
              plain
              size="small"
              @click="pickSingle(group, option)"
            >
              {{ option.label }}
            </el-button>
          </template>

          <!-- 多选：下拉，选中项在菜单里高亮 -->
          <el-dropdown v-else>
            <span class="el-dropdown-link" :class="{ 'is-picked': pickedCount(group) }">
              {{ summaryOf(group) }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="option in group.options"
                  :key="option.value"
                  :style="
                    listStore.hasFilter(group.key, option.value)
                      ? { color: 'var(--el-color-primary)', fontWeight: '500' }
                      : null
                  "
                  @click="pickMulti(group, option)"
                >
                  {{ option.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-panel {
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 46px;
  padding: 0 1rem;
}

.filter-toolbar-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.picked-badge {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-style: normal;
  animation: badge-in 0.24s ease both;
}

.filter-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  white-space: nowrap;
}

.filter-toolbar-actions .el-dropdown-link,
.topfilter-price .el-dropdown-link {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  cursor: pointer;
  color: #606266;
  font-size: 13px;
  transition: color 0.2s ease;
}

.el-dropdown-link:hover {
  color: var(--el-color-primary);
}

.el-dropdown-link.is-picked {
  color: var(--el-color-primary);
  font-weight: 500;
}

/*
 * index.css 里 .topfilter h5 有一条 line-height: 2px，
 * 单行看不出来，多行会把文字压扁，这里改回正常行高。
 */
.topfilter h5 {
  line-height: 1.5;
  margin: 0;
  white-space: nowrap;
}

@keyframes badge-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
