<script setup>
import {ref} from  'vue'
let bannerlist=ref([
    {id:1,img_url:'1.png'},
    {id:2,img_url:'2.png'},
    {id:3,img_url:'3.png'},
])
</script>

<template>
    <div class="banner">
      <el-carousel height="620px">
      <el-carousel-item v-for="item in bannerlist" :key="item.id">
    <img :src="`/img/${item.img_url}`" :alt="item.id">
      </el-carousel-item>
    </el-carousel>
    </div>
</template>
<style scoped>

</style>