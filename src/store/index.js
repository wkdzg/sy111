/**
 * 全局状态（轻量 reactive，不引入 Pinia）
 *
 * - catalogStore：8 条业务线的元信息（侧边栏 + 页面配置）
 * - listStore   ：列表页状态，查询参数由 categoryMeta.searchFields 驱动拼装
 * - orderStore  ：订单，存 localStorage（未登录也能下单，刷新不丢）
 * - userStore   ：登录态
 */

import { reactive } from 'vue'
import { catalogApi, productApi, authApi } from '@/api'

/* ------------------------------------------------------------------ *
 * 业务线元信息
 * ------------------------------------------------------------------ */
export const catalogStore = reactive({
  categories: [],
  orderTypes: [],
  metaMap: {},
  loading: false,

  async loadCategories() {
    const { data } = await catalogApi.all()
    this.categories = data
    return data
  },

  async loadOrderTypes() {
    const { data } = await catalogApi.orderTypes()
    this.orderTypes = data
    return data
  },

  /** 页面配置按 key 缓存，切来切去不用重复请求 */
  async loadMeta(key) {
    if (this.metaMap[key]) return this.metaMap[key]
    this.loading = true
    try {
      const { data } = await catalogApi.meta(key)
      this.metaMap[key] = data
      return data
    } finally {
      this.loading = false
    }
  }
})

/* ------------------------------------------------------------------ *
 * 列表页
 * ------------------------------------------------------------------ */
export const listStore = reactive({
  category: 'hotel',
  meta: null,
  list: [],
  total: 0,
  loading: false,
  /** false 时说明还没搜过，列表标题显示「为你推荐」 */
  searched: false,
  /** 搜索条的原始值，key 对应 meta.searchFields[].key */
  form: {},
  /** 筛选条选中值 { [filterKey]: [values] } */
  filters: {},
  sort: 'recommend',
  page: 1,
  pageSize: 10,

  /** 切换业务线：重置表单/筛选/分页，然后拉一次列表 */
  async init(category) {
    if (this.category !== category) {
      this.form = {}
      this.filters = {}
      this.sort = 'recommend'
      this.page = 1
      this.searched = false
    }
    this.category = category
    this.meta = await catalogStore.loadMeta(category)
    this.applyDefaults()
    return this.search(1)
  },

  /** 搜索条的默认值（日期默认明天出发 / 住一晚） */
  applyDefaults() {
    const fields = this.meta?.searchFields || []
    const hasDateRange = fields.some((f) => f.type === 'daterange')
    const hasDate = fields.some((f) => f.type === 'date')

    if (hasDateRange && !this.form.dateRange) {
      const fmt = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
      this.form.dateRange = [fmt(1), fmt(2)]
    }
    if (hasDate && !this.form.date) {
      this.form.date = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    }
  },

  /** 把搜索条 + 筛选条拼成后端查询参数 */
  buildParams(page) {
    const params = {
      category: this.category,
      sort: this.sort,
      page: page || this.page,
      pageSize: this.pageSize
    }

    ;(this.meta?.searchFields || []).forEach((field) => {
      const value = this.form[field.key]
      if (value === undefined || value === null || value === '') return

      if (field.type === 'daterange') {
        if (Array.isArray(value) && value.length === 2) {
          params.startDate = value[0]
          params.endDate = value[1]
        }
        return
      }
      params[field.key] = value
    })

    Object.entries(this.filters).forEach(([key, values]) => {
      if (values && values.length) params[key] = values
    })

    return params
  },

  async search(page) {
    if (page) this.page = page
    this.loading = true
    try {
      const payload = await productApi.list(this.buildParams())
      this.list = payload.data || []
      this.total = payload.total || 0
      this.searched = true
      return payload
    } finally {
      this.loading = false
    }
  },

  /** 多选筛选：再点一次取消 */
  toggleFilter(key, value) {
    const list = this.filters[key] ? [...this.filters[key]] : []
    const index = list.findIndex((v) => String(v) === String(value))
    if (index === -1) list.push(value)
    else list.splice(index, 1)
    this.filters[key] = list
  },

  /** 单选筛选：再点一次取消 */
  setSingleFilter(key, value) {
    const current = this.filters[key] || []
    this.filters[key] = current.length === 1 && String(current[0]) === String(value) ? [] : [value]
  },

  hasFilter(key, value) {
    return (this.filters[key] || []).some((v) => String(v) === String(value))
  },

  resetFilters() {
    this.filters = {}
    this.sort = 'recommend'
  },

  resetAll() {
    this.form = {}
    this.resetFilters()
    this.applyDefaults()
  },

  get activeFilterCount() {
    return Object.values(this.filters).reduce((sum, values) => sum + (values ? values.length : 0), 0)
  }
})

/* ------------------------------------------------------------------ *
 * 订单（localStorage，按账号分桶）
 *
 * 每个账号一个 key，互相看不到对方的订单：
 *   未登录 → vue222t_orders_guest
 *   已登录 → vue222t_orders_u<userId>
 * 登录 / 退出 / 换账号后调用 orderStore.switchScope() 重新读取。
 * ------------------------------------------------------------------ */
const GUEST_KEY = 'vue222t_orders_guest'
const accountKey = (id) => `vue222t_orders_u${id}`

const STATUS_TEXT = {
  PENDING_PAY: '待付款',
  PAID: '已预订',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
}

/** 当前该读写哪个 key —— userStore 定义在下面，这里只在调用时求值 */
function storageKey() {
  return userStore.user ? accountKey(userStore.user.id) : GUEST_KEY
}

/** 当前订单归属，UI 用来做提示 */
function scopeOf() {
  return userStore.user ? `u${userStore.user.id}` : 'guest'
}

function readLocalOrders(key) {
  try {
    const raw = localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}

function writeLocalOrders(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch (err) {
    /* 隐私模式写入失败时忽略，内存里仍然可用 */
  }
}

function makeOrderNo(seq) {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `VT${stamp}${String(seq).padStart(5, '0')}`
}

export const orderStore = reactive({
  orders: [],
  loaded: false,
  /** 当前订单归属：'guest' 或 'u<id>' */
  scope: 'guest',

  get isGuestScope() {
    return !userStore.user
  },

  /** 给 UI 用的归属说明 */
  get scopeLabel() {
    return userStore.user
      ? `${userStore.user.nickname || userStore.user.username} 的订单`
      : '本机游客订单'
  },

  /** 读取当前账号的订单 */
  load() {
    this.scope = scopeOf()
    this.orders = readLocalOrders(storageKey())
    this.loaded = true
    return this.orders
  },

  /** 登录 / 退出 / 换账号后调用，切到对应账号的订单 */
  switchScope() {
    return this.load()
  },

  persist() {
    writeLocalOrders(storageKey(), this.orders)
  },

  /**
   * 下单。payload 由 BookingDialog 组装，字段已按业务线归一化。
   */
  create(payload) {
    // 账号变了就先把订单换成当前账号的，避免写错桶
    if (!this.loaded || this.scope !== scopeOf()) this.load()

    const seq = this.orders.length + 1
    const now = new Date().toISOString()

    const order = {
      id: `${Date.now()}`,
      orderNo: makeOrderNo(seq),
      status: 'PENDING_PAY',
      statusText: STATUS_TEXT.PENDING_PAY,
      createdAt: now,
      updatedAt: now,
      ...payload,
      totalPrice: payload.unitPrice * payload.units
    }

    this.orders.unshift(order)
    this.persist()
    return order
  },

  find(idOrNo) {
    if (!this.loaded) this.load()
    return this.orders.find((o) => o.id === idOrNo || o.orderNo === idOrNo) || null
  },

  update(id, patch) {
    const index = this.orders.findIndex((o) => o.id === id)
    if (index === -1) return null
    this.orders[index] = { ...this.orders[index], ...patch, updatedAt: new Date().toISOString() }
    this.persist()
    return this.orders[index]
  },

  pay(id) {
    return this.update(id, { status: 'PAID', statusText: STATUS_TEXT.PAID })
  },

  cancel(id, reason = '用户主动取消') {
    return this.update(id, { status: 'CANCELLED', statusText: STATUS_TEXT.CANCELLED, cancelReason: reason })
  },

  finish(id) {
    return this.update(id, { status: 'COMPLETED', statusText: STATUS_TEXT.COMPLETED })
  },

  remove(id) {
    this.orders = this.orders.filter((o) => o.id !== id)
    this.persist()
  },

  clear() {
    this.orders = []
    this.persist()
  },

  /** 按业务线 + 状态筛选 */
  query({ category = 'all', status = 'all' } = {}) {
    if (!this.loaded) this.load()
    return this.orders.filter((order) => {
      if (category !== 'all' && order.category !== category) return false
      if (status !== 'all' && order.status !== status) return false
      return true
    })
  },

  /** 角标统计 */
  get statistics() {
    if (!this.loaded) this.load()
    return {
      total: this.orders.length,
      byStatus: Object.entries(STATUS_TEXT).map(([status, text]) => ({
        status,
        text,
        count: this.orders.filter((o) => o.status === status).length
      }))
    }
  }
})

/* ------------------------------------------------------------------ *
 * 用户
 * ------------------------------------------------------------------ */
export const userStore = reactive({
  user: null,

  get isLogin() {
    return Boolean(this.user)
  },

  setUser(user) {
    this.user = user
  },

  logout() {
    this.user = null
  }
})

export { STATUS_TEXT as ORDER_STATUS_TEXT }
