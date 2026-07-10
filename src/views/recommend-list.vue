<script setup>
import { ref } from 'vue'
let recommendlist1 = ref([
    { id: 1, img_url: 'jiud1.png', title: '北京万达文华酒店', desc: '位于北京市朝阳区建国路93号地处北京CBD核心商圈。', tag: ['网球场', '商务中心', '健身房', '游泳池', '餐厅', '酒吧', '会议室', '停车场', '接送服务'] },
    { id: 2, img_url: 'jiud2.png', title: '北京京伦饭店', desc: '位于北京市朝阳区建国路93号地处北京CBD核心商圈。', tag: ['网球场', '商务中心', '健身房', '游泳池'] },
    { id: 3, img_url: 'jiud3.png', title: '北京新世界中心同派酒店', desc: '位于北京市朝阳区建国路93号地处北京CBD核心商圈。', tag: ['网球场', '商务中心', '健身房', '游泳池'] }
])
</script>

<template>
    <div class="recommend-list">
        <ul>
            <li v-for="v in recommendlist1" :key="v.id">
                <div class="list-l">
                    <div class="list-l-img">
                       <img :src="`/img/${v.img_url}`" alt="">
                    </div>
                    <div class="list-l-title">
                        <div class="list-l-t">
                            <h4>{{ v.title }}</h4>
                            <span class="badge-thumb"></span>
                        </div>
                        <div class="list-l-tl">
                            <p>{{ v.desc }}</p>
                        </div>
                        <div class="list-l-tag">
                            <el-tag class="ml-2" type="danger" v-for="(k, i) in v.tag" :key="i">{{ k }}</el-tag>
                        </div>
                    </div>

                </div>
                <div class="list-r">
                    <div class="list-r-c">
                        <div class="l-r-c-d">
                            <p>好</p>
                            <a href="">(1000+)</a>
                        </div>
                        <div class="l-r-s">
                            <p>4.5</p>
                        </div>
                    </div>

                    <div class="list-r-p">
                        <p>y3333</p>
                        <el-button type="primary">查看详情</el-button>
                    </div>
                </div>

            </li>
        </ul>
    </div>
</template>
<style scoped></style>