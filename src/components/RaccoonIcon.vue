<script setup>
/**
 * 小浣熊主题图标组
 * 每个图标 = 业务符号 + 浣熊元素（圆耳 / 爪印 / 条纹），统一绿色描边
 */
defineProps({
  name: { type: String, required: true }
})
</script>

<template>
  <!-- 酒店：床（侧视）+ 床头冒出的浣熊圆耳 -->
  <svg class="menu-icon" width="26" height="26" v-if="name === 'hotel'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 21h24" />
    <path d="M4 21v7" />
    <path d="M28 21v7" />
    <path d="M7 28V11" />
    <path d="M7 16h7" />
    <path d="M14 16v5" />
    <path d="M20 21v-4h6" />
    <circle cx="10" cy="8" r="2.3" />
    <circle cx="17" cy="8" r="2.3" />
  </svg>

  <!-- 飞机票：飞机 + 爪印尾迹 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'flight'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 4l4 9 7 3v2l-7-1.5V24l3 2.5V28l-7-2-7 2v-1.5L12 24v-6.5L5 19v-2l7-3z" />
    <circle cx="6" cy="26" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="26" cy="26" r="1.4" fill="currentColor" stroke="none" />
  </svg>

  <!-- 火车票：车头 + 浣熊圆耳 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'train'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10.5" cy="7" r="2.3" />
    <circle cx="21.5" cy="7" r="2.3" />
    <rect x="8" y="9" width="16" height="13" rx="3.5" />
    <path d="M8 16h16" />
    <circle cx="13" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
    <path d="M12 22l-2.5 5" />
    <path d="M20 22l2.5 5" />
  </svg>

  <!-- 旅游：行李箱 + 爪印贴纸 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'travel'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="11" width="20" height="15" rx="3" />
    <path d="M12 11V7.5A2.5 2.5 0 0 1 14.5 5h3A2.5 2.5 0 0 1 20 7.5V11" />
    <path d="M6 17h20" />
    <circle cx="16" cy="21.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="13" cy="19" r="1" fill="currentColor" stroke="none" />
    <circle cx="19" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>

  <!-- 景点：山峰 + 爪印太阳 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'scenery'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 25l8-11 4.5 6 3-4L27 25z" />
    <circle cx="23" cy="9" r="2.6" />
    <circle cx="8" cy="7" r="1.3" fill="currentColor" stroke="none" />
  </svg>

  <!-- 汽车票：巴士 + 浣熊圆耳 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'bus'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="7" r="2.2" />
    <circle cx="22" cy="7" r="2.2" />
    <rect x="6" y="9" width="20" height="13" rx="3" />
    <path d="M9 12h14" />
    <path d="M9 17h14" />
    <circle cx="10" cy="24.5" r="2" />
    <circle cx="22" cy="24.5" r="2" />
  </svg>

  <!-- 船票：帆船 + 水波 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'ship'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 21h22l-2.5 5H7.5z" />
    <path d="M16 6v15" />
    <path d="M16 7l8 11h-8z" />
    <path d="M4 29q3-2 6 0t6 0 6 0 6 0" />
  </svg>

  <!-- 门票：票券 + 爪印 -->
  <svg class="menu-icon" width="26" height="26" v-else-if="name === 'ticket'" viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 9h22v4a2.5 2.5 0 0 0 0 6v4H5v-4a2.5 2.5 0 0 0 0-6z" />
    <path d="M16 11.5v3" stroke-dasharray="2 2.5" />
    <path d="M16 18v1.5" stroke-dasharray="2 2.5" />
    <circle cx="16" cy="24" r="1.4" fill="currentColor" stroke="none" />
  </svg>

  <!-- 兜底：简单圆点 -->
  <svg class="menu-icon" width="26" height="26" v-else viewBox="0 0 32 32" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round">
    <circle cx="16" cy="16" r="9" />
  </svg>
</template>
