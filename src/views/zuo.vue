<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Expand, Fold } from '@element-plus/icons-vue'
import { catalogStore } from '@/store'
import { uiStore } from '@/store/ui'
import RaccoonIcon from '@/components/RaccoonIcon.vue'

const route = useRoute()
const router = useRouter()

const isCollapse = ref(false)

const categories = computed(() => catalogStore.categories)
const width = computed(() => (isCollapse.value ? '64px' : '210px'))

/** 高亮当前业务线 */
const activeKey = computed(() => route.params.category || 'hotel')

function go(item) {
  if (route.params.category === item.key) return
  router.push(item.path)
  uiStore.closeDrawer()
}
</script>

<template>
  <el-aside :width="width" class="aside" :class="{ 'is-open': uiStore.drawerOpen }">
    <div class="aside-list" :style="{ width }">
      <div class="aside-toggle" :title="isCollapse ? '展开菜单' : '收起菜单'" @click="isCollapse = !isCollapse">
        <el-icon><component :is="isCollapse ? Expand : Fold" /></el-icon>
      </div>

      <el-menu
        :default-active="activeKey"
        :collapse="isCollapse"
        :collapse-transition="false"
        class="aside-menu"
      >
        <el-menu-item
          v-for="item in categories"
          :key="item.key"
          :index="item.key"
          @click="go(item)"
        >
          <RaccoonIcon :name="item.key" />
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </div>
  </el-aside>
</template>

<style scoped>
.aside,
.aside-list {
  transition: width 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.aside-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  margin-bottom: 6px;
  color: #909399;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: color 0.22s ease, background-color 0.22s ease;
}

.aside-toggle:hover {
  color: var(--el-color-primary);
  background-color: var(--el-fill-color-light);
}

/* 顶部多了折叠按钮，菜单高度要相应减掉，否则会溢出屏幕 */
.aside-menu {
  height: calc(100vh - 56px) !important;
  border-right: none;
}

/* 选中项左侧的强调条 */
.aside-menu :deep(.el-menu-item) {
  position: relative;
}

.aside-menu :deep(.el-menu-item)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 0;
  border-radius: 0 3px 3px 0;
  background: var(--el-color-primary);
  transform: translateY(-50%);
  transition: height 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}

.aside-menu :deep(.el-menu-item.is-active)::before {
  height: 60%;
}

.aside-menu :deep(.el-menu-item.is-active) {
  background-color: var(--el-color-primary-light-9);
}

/* 小浣熊主题图标：比原图标略大，绿色描边 */
.aside-menu :deep(.menu-icon) {
  width: 26px;
  height: 26px;
  flex: none;
  margin-right: 10px;
  color: #5f8b3e;
  transition: color 0.22s ease, transform 0.22s ease;
}

.aside-menu :deep(.el-menu-item:hover) .menu-icon {
  color: #4c6f32;
}

.aside-menu :deep(.el-menu-item.is-active) .menu-icon {
  color: #3f6129;
}

/* 收起时图标居中 */
.aside-menu.el-menu--collapse :deep(.menu-icon) {
  margin-right: 0;
}
</style>
