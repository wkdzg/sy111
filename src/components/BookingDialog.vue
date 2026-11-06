<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { orderStore } from '@/store'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  item: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const category = computed(() => props.item?.category || 'hotel')
const isHotel = computed(() => category.value === 'hotel')

const form = reactive({
  startDate: '',
  endDate: '',
  date: '',
  quantity: 1,
  guestName: '',
  guestPhone: '',
  remark: ''
})

const submitting = ref(false)

const today = () => new Date().toISOString().slice(0, 10)
const offsetDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

/** 打开时按业务线给默认值 */
watch(visible, (open) => {
  if (!open) return
  form.quantity = 1
  form.remark = ''
  if (isHotel.value) {
    form.startDate = offsetDate(1)
    form.endDate = offsetDate(2)
  } else {
    form.date = offsetDate(1)
  }
})

const nights = computed(() => {
  if (!isHotel.value || !form.startDate || !form.endDate) return 1
  const diff = (new Date(form.endDate) - new Date(form.startDate)) / 86400000
  return diff > 0 ? diff : 1
})

/** 计费单位数：酒店 = 晚 × 间，其他 = 份数 */
const units = computed(() => (isHotel.value ? nights.value * form.quantity : form.quantity))
const totalPrice = computed(() => (props.item ? props.item.price * units.value : 0))

const quantityLabel = computed(() => {
  if (isHotel.value) return '房间数'
  if (category.value === 'travel') return '出行人数'
  if (category.value === 'ticket') return '购买数量'
  return '乘客人数'
})

const quantityUnit = computed(() => (isHotel.value ? '间' : category.value === 'travel' ? '人' : '张'))

const dateLabel = computed(() => {
  if (category.value === 'scenery') return '游玩日期'
  if (category.value === 'ticket') return '使用日期'
  return '出发日期'
})

const PHONE_RE = /^1[3-9]\d{9}$/

function validate() {
  if (isHotel.value) {
    if (!form.startDate || !form.endDate) return '请选择入住和退房日期'
    if (new Date(form.endDate) <= new Date(form.startDate)) return '退房日期必须晚于入住日期'
  } else if (!form.date) {
    return `请选择${dateLabel.value}`
  }

  if (!form.guestName.trim()) return '请填写联系人姓名'
  if (!PHONE_RE.test(form.guestPhone.trim())) return '请填写正确的 11 位手机号'
  return ''
}

function submit() {
  const error = validate()
  if (error) {
    ElMessage.warning(error)
    return
  }

  submitting.value = true
  try {
    const item = props.item
    const order = orderStore.create({
      category: item.category,
      categoryTitle: item.categoryTitle || '',
      itemId: item.id,
      itemTitle: item.title,
      itemSubtitle: item.subtitle || '',
      itemImg: item.img_url,
      startDate: isHotel.value ? form.startDate : form.date,
      endDate: isHotel.value ? form.endDate : '',
      nights: isHotel.value ? nights.value : 1,
      quantity: form.quantity,
      units: units.value,
      unitPrice: item.price,
      unitLabel: isHotel.value ? '间/晚' : quantityUnit.value,
      guestName: form.guestName.trim(),
      guestPhone: form.guestPhone.trim(),
      remark: form.remark.trim()
    })

    ElMessage.success(`下单成功，订单号 ${order.orderNo}`)
    visible.value = false
    emit('success', order)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="填写预订信息" width="560px" align-center>
    <div v-if="item" class="booking">
      <!-- 商品摘要 -->
      <div class="summary">
        <img v-if="item.img_url" :src="item.img_url" :alt="item.title" />
        <div class="summary-text">
          <p class="summary-title">{{ item.title }}</p>
          <p v-if="item.subtitle" class="summary-sub">{{ item.subtitle }}</p>
          <p class="summary-desc">{{ item.desc }}</p>
        </div>
        <div class="summary-price">
          <span>¥{{ item.price }}</span>
          <small>{{ isHotel ? '/晚' : '/份' }}</small>
        </div>
      </div>

      <!-- 表单 -->
      <el-form label-width="90px" class="booking-form" @submit.prevent>
        <template v-if="isHotel">
          <el-form-item label="入住 / 退房">
            <el-date-picker
              v-model="form.startDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="入住日期"
              :disabled-date="(d) => d.getTime() < Date.now() - 86400000"
            />
            <span class="sep">至</span>
            <el-date-picker
              v-model="form.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="退房日期"
              :disabled-date="(d) => d.getTime() < Date.now() - 86400000"
            />
          </el-form-item>
        </template>

        <el-form-item v-else :label="dateLabel">
          <el-date-picker
            v-model="form.date"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="dateLabel"
            :disabled-date="(d) => d.getTime() < Date.now() - 86400000"
          />
        </el-form-item>

        <el-form-item :label="quantityLabel">
          <el-input-number v-model="form.quantity" :min="1" :max="20" />
          <span class="unit">{{ quantityUnit }}</span>
        </el-form-item>

        <el-form-item label="联系人">
          <el-input v-model="form.guestName" placeholder="请输入姓名" maxlength="20" />
        </el-form-item>

        <el-form-item label="手机号">
          <el-input v-model="form.guestPhone" placeholder="11 位手机号" maxlength="11" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填，如特殊要求" maxlength="100" show-word-limit />
        </el-form-item>
      </el-form>

      <!-- 费用明细 -->
      <div class="bill">
        <div class="bill-row">
          <span>
            ¥{{ item.price }} × {{ units }}
            {{ isHotel ? `（${nights} 晚 × ${form.quantity} 间）` : `${quantityUnit}` }}
          </span>
          <span>¥{{ totalPrice }}</span>
        </div>
        <div class="bill-row total">
          <span>应付总额</span>
          <strong>¥{{ totalPrice }}</strong>
        </div>
      </div>

      <p class="store-hint">订单会保存在本机浏览器中，未登录也能下单</p>
    </div>

    <template #footer>
      <el-button @click="visible = false">取 消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交订单</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.summary {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-light);
}

.summary img {
  width: 92px;
  height: 68px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.summary-text {
  flex: 1;
  min-width: 0;
}

.summary-title {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.summary-sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--el-color-primary);
}

.summary-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.summary-price {
  text-align: right;
  white-space: nowrap;
  color: #f56c6c;
  font-size: 18px;
  font-weight: 500;
}

.summary-price small {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.booking-form {
  margin-top: 18px;
}

.sep {
  margin: 0 8px;
  color: #909399;
}

.unit {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.bill {
  padding: 12px 14px;
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color-lighter);
}

.bill-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
}

.bill-row.total {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
  align-items: baseline;
}

.bill-row.total strong {
  color: #f56c6c;
  font-size: 20px;
}

.store-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #909399;
  text-align: right;
}
</style>
