import { reactive } from 'vue'

/**
 * 极简的 UI 状态：移动端侧边栏抽屉的开合 + 跨组件的「待打开商品」。
 * 用独立的 store 而不是塞进业务 store，避免和订单/用户数据耦合。
 */
export const uiStore = reactive({
  drawerOpen: false,
  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen
  },
  closeDrawer() {
    this.drawerOpen = false
  },

  /**
   * 待打开详情的商品。
   * 场景：右下角 AI 精灵推荐了某家酒店，用户点击后跳转到酒店列表页，
   * 列表页读到这个值就自动弹出该酒店的详情弹窗。
   * 形如 { id: 12, category: 'hotel' }
   */
  pendingProduct: null,

  openProduct(item) {
    this.pendingProduct = item
  },
  clearPendingProduct() {
    this.pendingProduct = null
  }
})
