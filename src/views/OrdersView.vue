<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { orderStore, catalogStore } from '@/store'

const route = useRoute()
const router = useRouter()

const status = ref('all')
/** 顶栏「我的订单」下拉可以带业务线过来 */
const category = ref(route.query.category ? String(route.query.category) : 'all')

watch(
  () => route.query.category,
  (value) => {
    category.value = value ? String(value) : 'all'
  }
)

const STATUS_TABS = [
  { value: 'all', label: '全部' },
  { value: 'PENDING_PAY', label: '待付款' },
  { value: 'PAID', label: '已预订' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' }
]

/** 业务线下拉的选项来自后端，不再写死 */
const categoryOptions = computed(() => [
  { value: 'all', label: '全部业务' },
  ...catalogStore.categories.map((item) => ({ value: item.key, label: item.title }))
])

const filtered = computed(() =>
  orderStore.query({ category: category.value, status: status.value })
)

/** 各状态角标数量 */
const countOf = (value) =>
  value === 'all'
    ? orderStore.orders.length
    : orderStore.orders.filter((o) => o.status === value).length

function pay(order) {
  orderStore.pay(order.id)
  ElMessage.success('支付成功')
}

async function cancel(order) {
  try {
    await ElMessageBox.confirm('确定要取消这个订单吗？', '取消订单', {
      confirmButtonText: '确定取消',
      cancelButtonText: '再想想',
      type: 'warning'
    })
  } catch (err) {
    return
  }
  orderStore.cancel(order.id)
  ElMessage.success('订单已取消')
}

function finish(order) {
  orderStore.finish(order.id)
  ElMessage.success('订单已完成')
}

async function remove(order) {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定删除吗？', '删除订单', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch (err) {
    return
  }
  orderStore.remove(order.id)
  ElMessage.success('已删除')
}

/** 订单卡片上的时间显示：酒店显示区间，其他显示单日 */
function dateText(order) {
  if (order.startDate && order.endDate) return `${order.startDate} 至 ${order.endDate}`
  return order.startDate || '-'
}

function goShopping() {
  router.push('/hotel')
}

onMounted(() => {
  orderStore.load()
  if (!catalogStore.categories.length) catalogStore.loadCategories().catch(() => {})
})
</script>

<template>
  <div class="orders-page">
    <div class="page-head">
      <div class="head-left">
        <h2>我的订单</h2>
        <span class="scope-tag" :class="{ 'is-guest': orderStore.isGuestScope }">
          {{ orderStore.scopeLabel }}
        </span>
      </div>
      <el-select v-model="category" size="small" style="width: 140px">
        <el-option
          v-for="option in categoryOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </div>

    <!-- 未登录时说明订单存在哪个桶里，避免用户以为订单丢了 -->
    <div v-if="orderStore.isGuestScope" class="scope-hint">
      <el-icon><info-filled /></el-icon>
      <span>
        当前未登录，下面是<b>本机游客订单</b>。不同账号的订单互相看不到 ——
        登录后会只显示当前账号自己的订单。
      </span>
    </div>

    <el-tabs v-model="status" class="status-tabs">
      <el-tab-pane v-for="tab in STATUS_TABS" :key="tab.value" :name="tab.value">
        <template #label>
          <span class="tab-label">
            {{ tab.label }}
            <em v-if="countOf(tab.value)">{{ countOf(tab.value) }}</em>
          </span>
        </template>
      </el-tab-pane>
    </el-tabs>

    <el-empty v-if="!filtered.length" description="这里还没有订单">
      <el-button type="primary" @click="goShopping">去逛逛</el-button>
    </el-empty>

    <transition-group v-else name="list" tag="div" class="order-list">
      <div v-for="order in filtered" :key="order.id" class="order-card">
        <div class="order-head">
          <div class="order-no">
            <span>订单号 {{ order.orderNo }}</span>
            <span class="order-cat">{{ order.categoryTitle }}</span>
          </div>
          <span class="order-status" :class="`is-${order.status.toLowerCase()}`">
            {{ order.statusText }}
          </span>
        </div>

        <div class="order-body">
          <img v-if="order.itemImg" :src="order.itemImg" :alt="order.itemTitle" />

          <div class="order-info">
            <p class="order-title">{{ order.itemTitle }}</p>
            <p class="order-sub">{{ order.itemSubtitle }}</p>
            <p class="order-line">
              {{ dateText(order) }}
              <template v-if="order.nights > 1"> · {{ order.nights }} 晚</template>
              · {{ order.quantity }}{{ order.unitLabel || '份' }}
            </p>
            <p class="order-line">联系人 {{ order.guestName }} · {{ order.guestPhone }}</p>
            <p v-if="order.remark" class="order-line">备注：{{ order.remark }}</p>
          </div>

          <div class="order-price">
            <span class="amount">¥{{ order.totalPrice }}</span>
            <small>¥{{ order.unitPrice }} × {{ order.units }}</small>

            <div class="order-actions">
              <template v-if="order.status === 'PENDING_PAY'">
                <el-button size="small" @click="cancel(order)">取消</el-button>
                <el-button size="small" type="primary" @click="pay(order)">去支付</el-button>
              </template>
              <template v-else-if="order.status === 'PAID'">
                <el-button size="small" @click="cancel(order)">取消</el-button>
                <el-button size="small" type="primary" @click="finish(order)">确认完成</el-button>
              </template>
              <template v-else>
                <el-button size="small" @click="remove(order)">删除</el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.orders-page {
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.scope-tag {
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
}

.scope-tag.is-guest {
  background: var(--el-fill-color);
  color: #909399;
}

.scope-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 4px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--el-color-info-light-9, #f4f4f5);
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  animation: fade-up 0.36s ease both;
}

.scope-hint b {
  color: #303133;
  font-weight: 500;
}

.page-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.status-tabs {
  margin-bottom: 8px;
}

.tab-label em {
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  background: var(--el-fill-color);
  font-size: 12px;
  font-style: normal;
  color: #909399;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.28s ease, transform 0.28s ease, border-color 0.28s ease;
}

.order-card:hover {
  transform: translateY(-2px);
  border-color: var(--el-color-primary-light-7);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fafbfc;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
  color: #606266;
}

.order-no {
  display: flex;
  align-items: center;
  gap: 10px;
}

.order-cat {
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
}

.order-status {
  font-weight: 500;
}

.is-pending_pay {
  color: #e6a23c;
}
.is-paid {
  color: var(--el-color-primary);
}
.is-completed {
  color: #67c23a;
}
.is-cancelled {
  color: #909399;
}

.order-body {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.order-body img {
  width: 150px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.order-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--el-color-primary);
}

.order-line {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}

.order-price {
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.amount {
  font-size: 22px;
  font-weight: 500;
  color: #f56c6c;
  line-height: 1.2;
}

.order-price small {
  font-size: 12px;
  color: #909399;
}

.order-actions {
  display: flex;
  gap: 6px;
  margin-top: auto;
  padding-top: 10px;
}

/* 列表增删动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.list-move {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (max-width: 640px) {
  .page-head {
    flex-wrap: wrap;
    gap: 8px;
  }
  .order-body {
    flex-direction: column;
  }
  .order-body img {
    width: 100%;
    height: 180px;
  }
  .order-price {
    align-items: flex-start;
    text-align: left;
  }
  .order-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
