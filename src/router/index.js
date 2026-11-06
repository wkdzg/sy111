import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 8 条业务线共用同一个 CategoryView，
 * 靠路由参数 :category 区分，页面内容由后端下发的 categoryMeta 驱动。
 */
const routes = [
  { path: '/', redirect: '/hotel' },

  {
    path: '/orders',
    name: 'orders',
    component: () => import('../views/OrdersView.vue'),
    meta: { title: '我的订单' }
  },

  {
    path: '/:category(hotel|flight|train|travel|scenery|bus|ship|ticket)',
    name: 'category',
    component: () => import('../views/CategoryView.vue')
  },

  { path: '/:pathMatch(.*)*', redirect: '/hotel' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  /** 切页面时回到顶部，否则从长列表切过去会停在中间 */
  scrollBehavior: () => ({ top: 0 })
})

export default router
