<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, ArrowDown, Avatar, Menu } from '@element-plus/icons-vue'
import AuthDialog from '@/components/AuthDialog.vue'
import SearchFaceIcon from '@/components/SearchFaceIcon.vue'
import { catalogStore, orderStore, userStore } from '@/store'
import { uiStore } from '@/store/ui'
import { authApi, setToken } from '@/api'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const authVisible = ref(false)
const authTab = ref('login')

const orderTypes = computed(() => catalogStore.orderTypes)

/** 待付款角标 */
const pendingCount = computed(() =>
  orderStore.orders.filter((order) => order.status === 'PENDING_PAY').length
)

function openAuth(tab) {
  authTab.value = tab
  authVisible.value = true
}

/** 顶栏搜索：带上关键词跳到当前业务线，由 CategoryView 应用 */
function search() {
  const value = keyword.value.trim()
  const category = route.params.category || 'hotel'
  router.push({ path: `/${category}`, query: value ? { kw: value } : {} })
}

/** 「我的订单」下拉：按业务线跳到订单页 */
function goOrders(typeKey) {
  router.push({
    path: '/orders',
    query: typeKey && typeKey !== 'all' ? { category: typeKey } : {}
  })
}

function logout() {
  authApi.logout().catch(() => {})
  setToken('')
  userStore.logout()
  ElMessage.success('已退出登录')
}
</script>

<template>
  <div class="headerNav">
    <el-button class="menu-toggle" :icon="Menu" circle plain @click="uiStore.toggleDrawer()" />
    <div class="header-logo" @click="router.push('/hotel')">
      <img src="../assets/img/logo-new.png" alt="小浣熊旅游规划" />
    </div>

    <div class="header-search">
      <el-input
        v-model="keyword"
        style="max-width: 600px"
        placeholder="搜索目的地、酒店、航班…"
        class="input-with-select"
        clearable
        @keyup.enter="search"
      >
        <template #append>
          <el-button :icon="SearchFaceIcon" @click="search" />
        </template>
      </el-input>
    </div>

    <div class="header-right">
      <template v-if="!userStore.isLogin">
        <el-link :icon="Avatar" @click="openAuth('login')">请登录</el-link>
        <el-link @click="openAuth('register')">注册</el-link>
      </template>
      <template v-else>
        <el-link :icon="Avatar" @click="goOrders('all')">
          {{ userStore.user.nickname || userStore.user.username }}
        </el-link>
        <el-link @click="logout">退出</el-link>
      </template>

      <el-link class="order-entry" @click="goOrders('all')">
        <el-badge :value="pendingCount" :hidden="!pendingCount" :offset="[6, 2]">
          <el-dropdown @command="goOrders">
            <span class="el-dropdown-link" @click.stop="goOrders('all')">
              我的订单
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="item in orderTypes" :key="item.key" :command="item.key">
                  {{ item.title }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-badge>
      </el-link>
    </div>

    <AuthDialog v-model="authVisible" :default-tab="authTab" />
  </div>
</template>

<style scoped>
/* ---------- 品牌 logo：手绘艺术字图片 ---------- */
.header-logo {
  display: flex;
  align-items: center;
  flex: none;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.header-logo:hover {
  transform: scale(1.03);
}

.header-logo img {
  height: 52px;
  width: auto;
  display: block;
}

.order-entry {
  margin-left: 0;
}

.order-entry :deep(.el-badge__content) {
  animation: badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes badge-pop {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
