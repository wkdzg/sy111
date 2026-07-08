import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path' // 引入 node 的 path 模块
import Components from 'unplugin-vue-components/vite' // 引入 unplugin-vue-components 插件
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), Components({
    resolvers: [ElementPlusResolver()]
  })],
  
  // 核心配置区
  resolve: {
    // 配置路径别名
    alias: {
      '@': path.resolve(__dirname, 'src') // 把 @ 指向 src 目录
    }
  },
  
  // 开发服务器配置
  server: {
    port: 8080,       // 可以把默认的 5173 端口改成你习惯的 8080
    open: true,       // 运行 npm run dev 时，自动在浏览器中打开页面
    cors: true        // 允许跨域
  }
})