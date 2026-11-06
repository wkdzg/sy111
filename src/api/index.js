/**
 * 接口清单，与 vue222t-server 的 src/routes 一一对应。
 * 组件里只 import 这里的方法，不要直接写 url 字符串。
 */

import { http } from './request'

/* ---------------- 业务线 / 页面配置 ---------------- */
export const catalogApi = {
  /** 首页聚合：{ categories, orderTypes, banners, filters } */
  bootstrap: () => http.get('/nav/bootstrap'),
  /** 侧边栏 8 条业务线 */
  all: () => http.get('/nav/categories'),
  /** 单条业务线的页面配置：searchFields / filterGroups / sorts / theme */
  meta: (key) => http.get(`/nav/categories/${key}`),
  orderTypes: () => http.get('/nav/order-types'),
  banners: () => http.get('/nav/banners'),
  cities: () => http.get('/nav/cities')
}

/* ---------------- 通用列表 / 详情（8 条业务线共用） ---------------- */
export const productApi = {
  /**
   * @param {object} params category / from / to / destination / keyword /
   *                        startDate / endDate / date / quantity /
   *                        sort / page / pageSize
   *                        + 任意筛选项，key 与 categoryMeta.filterGroups[].key 一致
   */
  list: (params) => http.get('/products', params),
  detail: (id, category) => http.get(`/products/${id}`, { category })
}

/* ---------------- 酒店专用（含房型 facet 统计） ---------------- */
export const hotelApi = {
  list: (params) => http.get('/hotels', params),
  detail: (id) => http.get(`/hotels/${id}`),
  facets: (params) => http.get('/hotels/facets', params)
}

/* ---------------- 用户 ---------------- */
export const authApi = {
  register: (data) => http.post('/auth/register', data),
  login: (data) => http.post('/auth/login', data),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
  updateMe: (data) => http.put('/auth/me', data)
}

/* ---------------- 订单（后端接口，游客下单走本地） ---------------- */
export const orderApi = {
  list: (params) => http.get('/orders', params),
  detail: (id) => http.get(`/orders/${id}`),
  create: (data) => http.post('/orders', data),
  pay: (id, data) => http.post(`/orders/${id}/pay`, data || {}),
  cancel: (id, data) => http.post(`/orders/${id}/cancel`, data || {}),
  finish: (id) => http.post(`/orders/${id}/finish`, {})
}

export const checkServer = () => http.get('/health')

export { getToken, setToken, RequestError } from './request'
