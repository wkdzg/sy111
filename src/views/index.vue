<script setup>
import {ref} from  'vue'
import zuo from './zuo.vue'
import tou from './tou.vue'
import search from'./search.vue'
import sx from'./sx.vue'
import recommend from'./recommend.vue'
</script>

<template>      
       <div class="common-layout">
    <el-container>
         <zuo />
      <el-container>
           <el-header>
            <tou />
           </el-header>
        <el-main>
            <search />
            <sx />
            <recommend />
        </el-main>
      </el-container>
    
    </el-container>
  </div>
</template>
<style scoped>
</style>