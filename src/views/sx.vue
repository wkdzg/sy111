<script setup>
import {ref} from  'vue'
const activeName = ref('first')
import { ArrowDown } from '@element-plus/icons-vue'
let topfilterlist=ref([
  {id:1,name:'first',label:'热门筛选',list:['天安门广场','王府井']},
  {id:2,name:'second',label:'机场车站',list:['首都机场','北京南站']},
  {id:3,name:'third',label:'商业区',list:['西单','东单']},
  {id:4,name:'fourth',label:'景点',list:['故宫','长城']}
])
let pricelist=ref(['五星（钻级）','四星（豪华）','三星（舒适）','二星（经济）','一星（简约）'])
let filterlist=ref([
  {title:'早餐',list:['含早餐','单份早餐','多份早餐']},
  {title:'支付方式',list:['在线付款','到店付款','闪住']},
  {title:'房型',list:['双床房','大床房','标准间']},
  {title:'酒店设施',list:['免费停车','免费WiFi','游泳池','健身房']}
])
</script>

<template>
    <div class="topfilter">
    <div><h5>区域位置</h5></div>
    <div>
 <el-tabs v-model="activeName" class="demo-tabs" @tab-click="handleClick">
    <el-tab-pane :label="v.label" :name="v.name" v-for="v in topfilterlist" :key="v.id">
          <el-button v-for="(k,i) in v.list" :key="i"type="info" plain size="small">{{ k }}</el-button>
           
    </el-tab-pane>
  </el-tabs>
     </div>
      <div><h5>星级价格</h5></div>
       <div  class="topfilter-price">
        <el-button v-for="(v,i) in pricelist" :key="i"type="info" plain size="small">{{ v }}</el-button></div>
        <div><h5>高级筛选</h5></div>
         <div>
          <div class="topfilter-price">
            <el-dropdown v-for="(v,i) in filterlist" :key="i" class="dropdown">
    <span class="el-dropdown-link">
      {{ v.title }}
      <el-icon class="el-icon--right">
        <arrow-down />
      </el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="(k, i) in v.list" :key="i">
          {{ k }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
          </div>
         </div>
    
     </div>
</template>
<style scoped>

</style>