<script setup>
import {ref} from  'vue'
import {
  Document,
  Menu as IconMenu,
  Location,
  Setting,
} from '@element-plus/icons-vue'
const isCollapse = ref(true)
let asidelist = [
  {
    id:1,
    title:'酒店',
    icon:'icon-tubiaozhizuomoban_jiudian'
  },
  {
    id:2,
    title:'飞机票',
    icon:'icon-tubiaozhizuomoban_feiji'
  },
  {
    id:3,
    title:'火车票',
    icon:'icon-tubiaozhizuomoban_huoche'
  },
  {
    id:4,
    title:'旅游',
    icon:'icon-tubiaozhizuomoban_fangqi'
  },
  {
    id:5,
    title:'景点',
    icon:'icon-tubiaozhizuomoban_fengjing'
  },
  {
    id:6,
    title:'汽车票',
    icon:'icon-tubiaozhizuomoban_bashi'
  },
  {
    id:7,
    title:'船票',
    icon:'icon-tubiaozhizuomoban_dulun'
  },
  {
    id:8,
    title:'门票',
    icon:'icon-menpiao'
  }
]
</script>

<template>
          <el-aside width="200px" class="aside" >
  <div class="aside-list">
    <el-menu
    default-active="2"
    class="el-menu-vertical-demo"
    :collapse="isCollapse"
    @open="handleOpen"
    @close="handleClose"
  >
  <el-radio-group v-model="isCollapse" style="margin-bottom: 20px">
    <el-radio-button :value="false" v-show="isCollapse">11</el-radio-button>
    <el-radio-button :value="true"v-show="!isCollapse">22</el-radio-button>
  </el-radio-group>
     <el-menu-item :index="item.id" v-for="item in asidelist" :key="item.id">
     <!-- <el-icon><component :is="item.icon" /></el-icon> -->
      <i class="iconfont" :class="item.icon"></i>
      <template #title>{{ item.title }}</template>
    </el-menu-item>
    </el-menu>
  </div>
          </el-aside>
</template>
<style scoped>
</style>