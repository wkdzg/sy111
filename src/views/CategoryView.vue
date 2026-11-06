<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import CategorySearchBar from '@/components/CategorySearchBar.vue'
import CategoryFilterBar from '@/components/CategoryFilterBar.vue'
import ProductCard from '@/components/ProductCard.vue'
import BookingDialog from '@/components/BookingDialog.vue'
import SideBanner from './banner.vue'
import { listStore } from '@/store'
import { uiStore } from '@/store/ui'
import { productApi } from '@/api'

const route = useRoute()
const category = computed(() => route.params.category || 'hotel')
const meta = computed(() => listStore.meta)

/** 每条业务线用自己的主题色，这里透传给 Element Plus 的 CSS 变量 */
const themeStyle = computed(() =>
  meta.value?.theme ? { '--el-color-primary': meta.value.theme } : {}
)

const bookingVisible = ref(false)
const bookingItem = ref(null)

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

async function load() {
  try {
    const payload = await listStore.init(category.value)

    // 顶栏搜索带过来的关键词
    const kw = route.query.kw ? String(route.query.kw) : ''
    if (kw) {
      applyKeyword(kw)
      await runSearch(1)
      return
    }

    if (!payload.total) ElMessage.warning('这个条件下暂时没有可预订的内容')
  } catch (err) {
    ElMessage.error(err.message)
  }
}

/** 把关键词写进该业务线的第一个文本字段（目的地 / 出发城市…） */
function applyKeyword(value) {
  const fields = listStore.meta?.searchFields || []
  const target = fields.find((field) => field.type === 'text')
  if (target) listStore.form[target.key] = value
  else listStore.form.keyword = value
}

/** 搜索 / 筛选变化都重新查一次，并回到第一页 */
async function runSearch(page = 1) {
  try {
    await listStore.search(page)
  } catch (err) {
    ElMessage.error(err.message)
  }
}

function openBooking(item) {
  bookingItem.value = item
  bookingVisible.value = true
}

async function openDetail(item) {
  detail.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    const { data } = await productApi.detail(item.id, item.category)
    detail.value = data
  } catch (err) {
    ElMessage.error(err.message)
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function onBooked() {
  ElMessage.success('订单已生成，可在「我的订单」中查看')
}

/**
 * AI 精灵推荐了某家酒店，用户点击后跳转到本页，这里自动打开它的详情弹窗。
 *
 * 同时监听 category：如果用户当前在「景点」页，点了酒店的"查看详情"，
 * pendingProduct 不变但路由参数变了（hotel），也要能触发。
 */
watch(
  [() => uiStore.pendingProduct, category],
  ([item]) => {
    if (!item || item.category !== category.value) return
    uiStore.clearPendingProduct()
    openDetail(item)
  },
  { immediate: true }
)

/** 切换业务线时重新加载；同一条业务线内不重复请求 */
watch(category, (value, oldValue) => {
  if (value !== oldValue) load()
})

/** 在同一个页面里用顶栏搜索，只变 query 不变 path，单独监听一次 */
watch(
  () => route.query.kw,
  (value) => {
    if (!value) return
    applyKeyword(String(value))
    runSearch(1)
  }
)

onMounted(load)
</script>

<template>
  <div class="category-page" :style="themeStyle">
    <!-- 页面标题 -->
    <div class="page-head">
      <h2>
        {{ meta?.title || '加载中' }}
        <span class="dot">·</span>
        <small>{{ meta?.slogan }}</small>
      </h2>
    </div>

    <CategorySearchBar @search="runSearch(1)" />
    <CategoryFilterBar @change="runSearch(1)" />

    <div class="recommend">
      <div class="r-left">
        <div class="list-header">
          <span v-if="listStore.searched">
            {{ meta?.title }}搜索结果
            <em>共 {{ listStore.total }} 条</em>
          </span>
          <span v-else>为你推荐</span>
        </div>

        <!-- 骨架屏：加载时占位，避免列表跳动 -->
        <ul v-if="listStore.loading && !listStore.list.length" class="skeleton-list">
          <li v-for="n in 4" :key="n" class="skeleton-card">
            <div class="sk-img"></div>
            <div class="sk-body">
              <div class="sk-line w40"></div>
              <div class="sk-line w80"></div>
              <div class="sk-line w60"></div>
            </div>
          </li>
        </ul>

        <el-empty
          v-else-if="!listStore.list.length"
          description="没有找到符合条件的内容"
        >
          <el-button type="primary" @click="listStore.resetAll(); runSearch(1)">
            重置筛选条件
          </el-button>
        </el-empty>

        <ul v-else class="product-list">
          <ProductCard
            v-for="(item, index) in listStore.list"
            :key="item.id"
            :item="item"
            :index="index"
            @detail="openDetail"
            @book="openBooking"
          />
        </ul>

        <el-pagination
          v-if="listStore.total > listStore.pageSize"
          class="list-pagination"
          layout="prev, pager, next, total"
          background
          :current-page="listStore.page"
          :page-size="listStore.pageSize"
          :total="listStore.total"
          @current-change="runSearch"
        />
      </div>

      <div class="r-right">
        <SideBanner />
      </div>
    </div>

    <!-- 下单 -->
    <BookingDialog v-model="bookingVisible" :item="bookingItem" @success="onBooked" />

    <!-- 详情 -->
    <el-dialog
      v-model="detailVisible"
      :title="detail ? detail.title : '详情'"
      width="640px"
      align-center
    >
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="detail">
          <img v-if="detail.img_url" class="detail-cover" :src="detail.img_url" :alt="detail.title" />

          <div class="detail-head">
            <div>
              <p v-if="detail.subtitle" class="detail-sub">{{ detail.subtitle }}</p>
              <p class="detail-desc">{{ detail.desc }}</p>
              <p class="detail-addr">{{ detail.address }}</p>
            </div>
            <div class="detail-score">
              <strong>{{ detail.score }}</strong>
              <span>{{ detail.commentText }} · {{ detail.commentCount }} 条评价</span>
            </div>
          </div>

          <div class="detail-tags">
            <el-tag v-for="(tag, i) in detail.tags" :key="i" size="small" effect="light">
              {{ tag }}
            </el-tag>
          </div>

          <!-- 酒店：房型表 -->
          <template v-if="detail.roomList">
            <h4 class="detail-sub-title">可选房型</h4>
            <el-table :data="detail.roomList" size="small">
              <el-table-column prop="type" label="房型" />
              <el-table-column label="价格" width="100">
                <template #default="{ row }">¥{{ row.price }}</template>
              </el-table-column>
              <el-table-column prop="breakfast" label="早餐" width="100" />
              <el-table-column label="剩余" width="80">
                <template #default="{ row }">{{ row.remaining }} 间</template>
              </el-table-column>
            </el-table>
          </template>

          <!-- 非酒店：业务字段表 -->
          <template v-else-if="detail.meta">
            <h4 class="detail-sub-title">详细信息</h4>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item
                v-for="(value, key) in detail.meta"
                :key="key"
                :label="String(key)"
              >
                {{ value }}
              </el-descriptions-item>
            </el-descriptions>
          </template>
        </template>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关 闭</el-button>
        <el-button type="primary" @click="detailVisible = false; openBooking(detail)">
          立即预订
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.category-page {
  width: 100%;
  max-width: 1380px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-head h2 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.page-head .dot {
  color: var(--el-color-primary);
}

.page-head small {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 12px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.list-header em {
  margin-left: 8px;
  font-style: normal;
  font-size: 13px;
  font-weight: 400;
  color: #909399;
}

.list-pagination {
  justify-content: center;
  margin-top: 16px;
}

/* ---------------- 骨架屏 ---------------- */
.skeleton-card {
  display: flex;
  gap: 14px;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 6px;
  background: #f4f6f9;
}

.sk-img,
.sk-line {
  background: linear-gradient(90deg, #e8ebf0 25%, #f2f4f8 37%, #e8ebf0 63%);
  background-size: 400% 100%;
  animation: skeleton-shine 1.4s ease infinite;
  border-radius: 4px;
}

.sk-img {
  width: 190px;
  height: 128px;
  flex-shrink: 0;
}

.sk-body {
  flex: 1;
  padding-top: 6px;
}

.sk-line {
  height: 14px;
  margin-bottom: 12px;
}

.w40 {
  width: 40%;
}
.w60 {
  width: 60%;
}
.w80 {
  width: 80%;
}

@keyframes skeleton-shine {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

/* ---------------- 详情弹窗 ---------------- */
.detail-body {
  min-height: 120px;
}

.detail-cover {
  width: 100%;
  height: 230px;
  object-fit: cover;
  border-radius: 6px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 14px;
}

.detail-sub {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.detail-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
}

.detail-addr {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}

.detail-score {
  text-align: right;
  white-space: nowrap;
}

.detail-score strong {
  display: block;
  font-size: 26px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.detail-score span {
  font-size: 12px;
  color: #909399;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.detail-sub-title {
  margin: 18px 0 8px;
  font-size: 14px;
  font-weight: 500;
}
</style>
