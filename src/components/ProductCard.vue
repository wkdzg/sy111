<script setup>
import { computed } from 'vue'
import { Promotion } from '@element-plus/icons-vue'

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 }
})

const emit = defineEmits(['detail', 'book'])

const TRANSIT = ['flight', 'train', 'bus', 'ship']

const isTransit = computed(() => TRANSIT.includes(props.item.category))

/** 出发 → 到达 时间轴，只有交通类才有 */
const timeline = computed(() => {
  const meta = props.item.meta
  if (!meta || !meta.departTime) return null
  return { depart: meta.departTime, arrive: meta.arriveTime, duration: meta.duration }
})

/** 各业务线的关键信息行 */
const facts = computed(() => {
  const item = props.item
  const meta = item.meta || {}

  switch (item.category) {
    case 'hotel':
      return [item.area, item.landmark ? `距${item.landmark} ${item.distance}` : '', item.breakfast]
    case 'travel':
      return [`${meta.days} 天 ${meta.nights} 晚`, meta.tripMode, `${meta.from} 出发`]
    case 'scenery':
      return [`${meta.level} 级景区`, `开放 ${meta.openTime}`]
    case 'ticket':
      return [meta.ticketType, `有效期 ${meta.validDays}`]
    case 'flight':
      return [item.address, meta.stopover, meta.cabin, meta.aircraft]
    case 'train':
      return [item.address, meta.trainType, meta.seatType]
    case 'bus':
      return [item.address, meta.busType]
    case 'ship':
      return [item.address, meta.shipName, meta.cabinType]
    default:
      return [item.address]
  }
})

const priceUnit = computed(() => {
  if (props.item.category === 'hotel') return '/晚'
  if (props.item.category === 'travel') return '/人'
  return '/张'
})

/**
 * 机票 / 火车票 / 汽车票 / 船票 没有「评分、点评」这个概念，
 * 后端在 category 配置里标了 scoreEnabled: false，这里改成显示准点率与余票。
 */
const showScore = computed(() => props.item.scoreEnabled !== false)

/** 交错入场：每张卡片延迟 40ms，最多叠到 320ms */
const delay = computed(() => `${Math.min(props.index, 8) * 40}ms`)
</script>

<template>
  <li class="card" :style="{ animationDelay: delay }">
    <div class="list-l">
      <!-- 交通类（机票/火车票/汽车票/船票）没有配图，直接不渲染图片位 -->
      <div v-if="item.img_url" class="list-l-img">
        <img :src="item.img_url" :alt="item.title" loading="lazy" />
      </div>

      <div class="list-l-title">
        <div class="list-l-t">
          <h4>{{ item.title }}</h4>
          <span v-if="item.subtitle" class="subtitle">{{ item.subtitle }}</span>
        </div>

        <!-- 交通类：出发 —— 历时 —— 到达 -->
        <div v-if="timeline" class="timeline">
          <span class="time">{{ timeline.depart }}</span>
          <span class="rail">
            <i class="dot"></i>
            <em>{{ timeline.duration }}</em>
            <i class="dot"></i>
          </span>
          <span class="time">{{ timeline.arrive }}</span>
        </div>

        <p class="desc">{{ item.desc }}</p>

        <div class="facts">
          <span v-for="(fact, i) in facts.filter(Boolean)" :key="i">{{ fact }}</span>
        </div>

        <div class="list-l-tag">
          <el-tag
            v-for="(tag, i) in item.tags"
            :key="i"
            size="small"
            :type="i === 0 ? 'danger' : 'info'"
            effect="light"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </div>

    <div class="list-r">
      <!-- 酒店 / 旅游 / 景点 / 门票：显示评分 -->
      <div v-if="showScore" class="list-r-c">
        <div class="l-r-c-d">
          <p>{{ item.commentText }}</p>
          <a href="javascript:;">({{ item.commentCount }})</a>
        </div>
        <div class="l-r-s">
          <p>{{ item.score }}</p>
        </div>
      </div>

      <!-- 交通类：没有评分，显示准点率与余票 -->
      <div v-else class="list-r-stat">
        <span v-for="(stat, i) in item.stats || []" :key="i" class="stat-item">
          <em>{{ stat.label }}</em>
          <strong>{{ stat.value }}</strong>
        </span>
      </div>

      <div class="list-r-p">
        <p class="price">
          ¥{{ item.price }}
          <span class="price-unit">{{ priceUnit }}起</span>
        </p>
        <p v-if="item.totalPrice && item.quantity > 1" class="price-total">
          {{ item.quantity }} 份合计 ¥{{ item.totalPrice }}
        </p>
        <div class="actions">
          <el-button size="small" text @click="emit('detail', item)">查看详情</el-button>
          <el-button type="primary" size="small" :icon="Promotion" @click="emit('book', item)">
            立即预订
          </el-button>
        </div>
      </div>
    </div>
  </li>
</template>

<style scoped>
.card {
  animation: card-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.subtitle {
  margin-left: 10px;
  font-size: 13px;
  font-weight: 400;
  color: var(--el-color-primary);
  white-space: nowrap;
}

.timeline {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 4px;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}
.timeline .rail {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 220px;
}
.timeline .rail em {
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  color: #909399;
  white-space: nowrap;
  padding: 0 6px;
  border-top: 1px dashed #c8c9cc;
  line-height: 1;
}
.timeline .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-color-primary);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.price-total {
  margin: 2px 0 6px;
  font-size: 12px;
  color: #909399;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 6px;
}

/* 交通类的统计块：准点率 / 余票 */
.list-r-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  padding-top: 2px;
}

.stat-item {
  font-size: 12px;
  color: #909399;
  line-height: 1.2;
}

.stat-item em {
  font-style: normal;
}

.stat-item strong {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.list-l-img {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
}

.list-l-img img {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.card:hover .list-l-img img {
  transform: scale(1.08);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
