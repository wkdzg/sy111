<script setup>
import { onMounted, watch } from 'vue'
import zuo from './views/zuo.vue'
import tou from './views/tou.vue'
import AiPlanner from './components/AiPlanner.vue'
import { catalogStore, orderStore, userStore } from '@/store'
import { uiStore } from '@/store/ui'
import { getToken, setToken, authApi } from '@/api'

/** 侧边栏 + 订单类型只拉一次，页面切换时复用缓存 */
async function bootstrap() {
  try {
    await Promise.all([catalogStore.loadCategories(), catalogStore.loadOrderTypes()])
  } catch (err) {
    /* 后端没起来时静默失败，页面上会由各请求自己提示 */
  }
  orderStore.load()
  restoreSession()
}

/** 带着 token 刷新页面时恢复登录态 */
async function restoreSession() {
  if (!getToken()) return
  try {
    const { data } = await authApi.me()
    userStore.setUser(data)
  } catch (err) {
    setToken('')
  }
}

onMounted(bootstrap)

/**
 * 订单按账号分桶存储，登录 / 退出 / 换账号时都要换成对应账号的订单，
 * 否则会把 A 账号的订单读出来给 B 看。
 */
watch(
  () => userStore.user?.id ?? null,
  () => orderStore.switchScope()
)
</script>

<template>
  <div class="common-layout">
    <div class="drawer-mask" v-if="uiStore.drawerOpen" @click="uiStore.closeDrawer()"></div>
    <el-container>
      <zuo />
      <el-container>
        <el-header>
          <tou />
        </el-header>
        <el-main>
          <!-- 页面切换过渡：淡入 + 上移 -->
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>

    <!-- 右下角 AI 旅行精灵 -->
    <AiPlanner />
  </div>
</template>

<style scoped>
</style>
