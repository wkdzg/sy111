<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { catalogApi } from '@/api'

const router = useRouter()

/** 轮播图由后端下发，img_url 已是可直接访问的完整路径 */
const bannerlist = ref([])
const loading = ref(false)
const current = ref(0)
let timer = null

async function loadBanners() {
  loading.value = true
  try {
    const { data } = await catalogApi.banners()
    bannerlist.value = data || []
    startAuto()
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    loading.value = false
  }
}

function startAuto() {
  stopAuto()
  if (bannerlist.value.length <= 1) return
  timer = setInterval(() => {
    current.value = (current.value + 1) % bannerlist.value.length
  }, 4500)
}

function stopAuto() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function goTo(i) {
  current.value = i
  startAuto()
}

function open(item) {
  if (item.link) router.push(item.link)
}

onMounted(loadBanners)
onUnmounted(stopAuto)
</script>

<template>
  <div class="banner" v-loading="loading">
    <div
      class="banner-viewport"
      @mouseenter="stopAuto"
      @mouseleave="startAuto"
    >
      <div
        class="banner-item"
        v-for="(item, i) in bannerlist"
        :key="item.id"
        :class="{ active: i === current }"
        @click="open(item)"
      >
        <img :src="item.img_url" :alt="item.title" />
        <div class="banner-mask"></div>
        <div class="banner-text">
          <h3>{{ item.title }}</h3>
          <p>{{ item.subtitle }}</p>
          <span class="banner-cta">立即查看 →</span>
        </div>
      </div>
    </div>

    <!-- 指示点 -->
    <div class="banner-dots" v-if="bannerlist.length > 1">
      <span
        v-for="(item, i) in bannerlist"
        :key="item.id"
        class="dot"
        :class="{ active: i === current }"
        @click.stop="goTo(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.banner {
  position: relative;
  width: 400px;
  height: 620px;
  border-radius: 12px;
  overflow: hidden;
}

.banner-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.banner-item {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.62s ease;
}

.banner-item.active {
  opacity: 1;
  pointer-events: auto;
  z-index: 1;
}

.banner-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.banner-item:hover img {
  transform: scale(1.05);
}

/* 暖棕色遮罩，配合浅色手绘插画，避免黑色遮罩发脏 */
.banner-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(58, 46, 32, 0.72) 0%,
    rgba(58, 46, 32, 0.22) 38%,
    rgba(58, 46, 32, 0) 66%
  );
}

.banner-text {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 42px;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

.banner-text h3 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 1px;
}

.banner-text p {
  margin: 0;
  font-size: 13px;
  opacity: 0.92;
  line-height: 1.6;
}

.banner-cta {
  display: inline-block;
  margin-top: 14px;
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  font-size: 12px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.32s ease, transform 0.32s ease, background-color 0.32s ease;
}

.banner-item:hover .banner-cta {
  opacity: 1;
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.18);
}

/* 指示点 */
.banner-dots {
  position: absolute;
  right: 20px;
  bottom: 18px;
  display: flex;
  gap: 6px;
  z-index: 2;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: all 0.28s ease;
}

.dot.active {
  width: 18px;
  border-radius: 4px;
  background: #fff;
}
</style>
