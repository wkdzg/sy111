<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import elfImg from '@/assets/img/ai-elf.png'
import { uiStore } from '@/store/ui'

const router = useRouter()

/**
 * 小浣熊 AI 旅行精灵
 * --------------------------------------------------------------
 * 右下角悬浮球（浣熊头像）→ 点击展开对话面板 → 发消息调后端 /api/ai/chat
 */

const open = ref(false)           // 面板是否展开
const input = ref('')             // 输入框内容
const sending = ref(false)        // 是否正在等待回复
const mode = ref('plan')          // 'chat' 普通咨询 | 'plan' 行程规划（多智能体）
const messages = ref([
  {
    role: 'ai',
    text: '你好呀，我是旅行精灵小浣熊～\n告诉我城市、天数和预算，我帮你把行程、酒店和报价都排好。'
  }
])

const listRef = ref(null)         // 消息列表 DOM，用于自动滚到底部

/** 打开/关闭面板 */
function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(scrollToBottom)
  }
}

/** 更新某条消息里的步骤状态（同 label 视为同一步） */
function upsertStep(list, payload) {
  const found = list.find((s) => s.label === payload.label)
  if (found) {
    found.status = payload.status
    if (payload.cost !== undefined) found.cost = payload.cost
  } else {
    list.push({ label: payload.label, status: payload.status, cost: payload.cost })
  }
}

/**
 * 构造对话历史，供后端理解"再便宜点""第二个方案"这类追问
 * --------------------------------------------------------------
 * 只带最近 6 条（约 3 轮），太长会拖慢速度、也不必要。
 * 方案类的消息压缩成一行摘要，避免把整个方案塞进上下文。
 */
function buildHistory() {
  return messages.value
    .slice(-6)
    .map((m) => {
      if (m.type === 'plans' && m.plans) {
        const brief = m.plans.map((p) => `${p.name}¥${p.budget.total}`).join('、')
        return { role: 'assistant', content: `给出了 ${m.plans.length} 个方案：${brief}` }
      }
      return {
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || ''
      }
    })
    .filter((h) => h.content)
}

/**
 * 流式规划：接收步骤进度，最后拿到方案
 */
async function streamPlan(text, history = []) {
  messages.value.push({ role: 'ai', text: '', steps: [], streaming: true })
  const idx = messages.value.length - 1

  try {
    const res = await fetch('/api/ai/plan/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.message || `HTTP ${res.status}`)
    }
    if (!res.body) throw new Error('当前浏览器不支持流式读取')

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const blocks = buffer.split('\n\n')
      buffer = blocks.pop()

      for (const block of blocks) {
        let event = 'message'
        const dataLines = []

        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
        }
        if (!dataLines.length) continue

        let payload
        try {
          payload = JSON.parse(dataLines.join('\n'))
        } catch (err) {
          continue
        }

        const cur = messages.value[idx]

        if (event === 'step') {
          upsertStep(cur.steps, payload)
          scrollToBottom()
        } else if (event === 'done') {
          if (payload.steps && payload.steps.length) cur.steps = payload.steps

          if (payload.plans && payload.plans.length) {
            // 正常拿到三个方案
            cur.type = 'plans'
            cur.plans = payload.plans
            cur.evaluation = payload.evaluation || null
            cur.thinking = payload.evaluation?.thinking || ''
          } else {
            // 信息不足 / 城市无数据
            cur.text = payload.reply || '（没有生成内容，请重试）'
          }
        } else if (event === 'error') {
          cur.text = `规划失败：${payload.message}`
        }
      }
    }
  } catch (err) {
    messages.value[idx].text = `规划失败：${err.message}`
  } finally {
    messages.value[idx].streaming = false
    sending.value = false
    scrollToBottom()
  }
}

/** 取某个方案的评分 */
function scoreOf(msg, planId) {
  const list = msg.evaluation?.evaluation || []
  return list.find((e) => e.planId === planId) || { cost: '-', comfort: '-', experience: '-', comment: '' }
}

/** 判断是否为推荐方案 */
function isRecommended(msg, planId) {
  return msg.evaluation?.recommendation?.planId === planId
}

/**
 * 把文本里的 **加粗** 拆成片段
 * --------------------------------------------------------------
 * 模型的回复带 markdown 语法，直接显示会看到星号。
 * 这里不用 v-html（有 XSS 风险），而是拆成片段后用 <span> 渲染，
 * 只处理加粗，不解析任何 HTML，安全且够用。
 */
function parseBold(text) {
  if (!text) return [{ text: '', bold: false }]

  const parts = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false })
    parts.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false })

  return parts.length ? parts : [{ text, bold: false }]
}

/* ---------------- 方案点击展开 ---------------- */
const expandedKey = ref('')   // 形如 "0-B"，同一时间只展开一个
const copiedKey = ref('')     // 刚复制过的方案，用于按钮文字反馈

function planKey(msgIndex, planId) {
  return `${msgIndex}-${planId}`
}

function togglePlan(msgIndex, planId) {
  const key = planKey(msgIndex, planId)
  expandedKey.value = expandedKey.value === key ? '' : key
}

function isExpanded(msgIndex, planId) {
  return expandedKey.value === planKey(msgIndex, planId)
}

/** 把方案拼成纯文本，方便复制到微信/备忘录 */
function planToText(p) {
  const lines = [`【${p.name}】${p.tagline}`]
  lines.push(`总花费：¥${p.budget.total}`)
  lines.push(`住宿：${p.hotel.name}（¥${p.hotel.price}/晚 × ${p.budget.nights} 晚 = ¥${p.budget.hotel}）`)
  p.days.forEach((d) => {
    const names = d.spots.length ? d.spots.map((s) => s.name).join('、') : '自由活动 / 返程'
    lines.push(`第 ${d.day} 天 [${d.area}]：${names}`)
  })
  lines.push(`预算明细：住宿 ¥${p.budget.hotel} + 门票 ¥${p.budget.tickets} + 餐饮 ¥${p.budget.food} = ¥${p.budget.total}`)
  if (p.adjustments && p.adjustments.length) {
    lines.push(`自动调整：${p.adjustments.join('；')}`)
  }
  return lines.join('\n')
}

async function copyPlan(msgIndex, p) {
  const key = planKey(msgIndex, p.id)
  try {
    await navigator.clipboard.writeText(planToText(p))
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = ''
    }, 1800)
  } catch (err) {
    copiedKey.value = ''
  }
}

/**
 * 点酒店 → 跳到酒店列表页并自动弹出它的详情
 * --------------------------------------------------------------
 * 这里不直接操作列表页的弹窗，而是把「要打开哪个商品」写进 uiStore，
 * 由 CategoryView 监听后自己打开。这样两个组件互不依赖。
 */
function gotoHotel(plan) {
  const id = plan?.hotel?.id
  if (!id) {
    return
  }
  uiStore.openProduct({ id, category: 'hotel' })
  open.value = false      // 收起面板，避免遮挡列表页
  router.push('/hotel')
}

/** 点景点 → 跳到景点列表页并自动弹出详情 */
function gotoSpot(spot) {
  const id = spot?.id
  if (!id) {
    return
  }
  uiStore.openProduct({ id, category: 'scenery' })
  open.value = false
  router.push('/scenery')
}

/** 普通对话：一次性返回（同样带上历史，支持多轮闲聊） */
async function chatOnce(text, history = []) {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    })
    const json = await res.json()

    if (json.code === 0) {
      messages.value.push({ role: 'ai', text: json.data.reply })
    } else {
      messages.value.push({
        role: 'ai',
        text: json.message || '小浣熊暂时开小差了，稍后再试～'
      })
    }
  } catch (err) {
    messages.value.push({ role: 'ai', text: '网络出问题了，请检查后端是否启动。' })
  } finally {
    sending.value = false
    scrollToBottom()
  }
}

/** 发送消息 */
async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return

  // 先取历史（此时还没把本条用户消息加进去，避免重复）
  const history = buildHistory()

  messages.value.push({ role: 'user', text })
  input.value = ''
  sending.value = true
  scrollToBottom()

  if (mode.value === 'plan') {
    await streamPlan(text, history)
  } else {
    await chatOnce(text, history)
  }
}

/** 滚动到消息列表底部 */
function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

/** 回车发送（Shift+回车换行） */
function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

/** 快捷示例：用数据库里确实有景点数据的城市 */
const samples = ['成都 3 天 预算 2000', '三亚 3 天 预算 3000', '西安 2 天 预算 1500']
function useSample(s) {
  mode.value = 'plan'
  input.value = s
  send()
}
</script>

<template>
  <div class="elf-root">
    <!-- 展开面板 -->
    <transition name="panel">
      <div v-if="open" class="elf-panel">
        <!-- 头部 -->
        <div class="elf-head">
          <img class="elf-head-avatar" :src="elfImg" alt="小浣熊" />
          <div class="elf-head-info">
            <div class="elf-head-name">旅行精灵 · 小浣熊</div>
            <div class="elf-head-sub">AI 行程助手</div>
          </div>
          <button class="elf-close" @click="toggle" aria-label="关闭">×</button>
        </div>

        <!-- 模式切换：规划走多智能体，咨询走普通对话 -->
        <div class="elf-tabs">
          <button
            class="elf-tab"
            :class="{ active: mode === 'plan' }"
            @click="mode = 'plan'"
          >行程规划</button>
          <button
            class="elf-tab"
            :class="{ active: mode === 'chat' }"
            @click="mode = 'chat'"
          >随便问问</button>
        </div>

        <!-- 消息区 -->
        <div ref="listRef" class="elf-body">
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="elf-msg"
            :class="m.role === 'user' ? 'is-user' : 'is-ai'"
          >
            <img v-if="m.role === 'ai'" class="elf-msg-avatar" :src="elfImg" alt="" />
            <div class="elf-bubble-wrap" :class="{ 'is-plans': m.type === 'plans' }">
              <!-- 普通文本消息（**加粗** 渲染成粗体，星号不显示） -->
              <div v-if="m.type !== 'plans'" class="elf-bubble">
                <span
                  v-for="(seg, si) in parseBold(m.text)"
                  :key="si"
                  :class="{ 'elf-bold': seg.bold }"
                >{{ seg.text }}</span>
              </div>

              <!-- 三个候选方案 -->
              <div v-else class="elf-plans">
                <!-- 评估时的思考过程 -->
                <div v-if="m.thinking" class="elf-thinking">
                  <span class="elf-thinking-tag">思考</span>{{ m.thinking }}
                </div>

                <!-- 方案卡片 -->
                <div
                  v-for="(p, pi) in m.plans"
                  :key="p.id"
                  class="elf-plan"
                  :class="{ 'is-reco': m.plans.length > 1 && isRecommended(m, p.id), 'is-open': isExpanded(i, p.id) }"
                  @click="togglePlan(i, p.id)"
                >
                  <div class="elf-plan-head">
                    <span class="elf-plan-id">{{ p.id }}</span>
                    <span class="elf-plan-name">{{ p.name }}</span>
                    <span v-if="m.plans.length > 1 && isRecommended(m, p.id)" class="elf-reco-tag">推荐</span>
                    <span class="elf-plan-total">¥{{ p.budget.total }}</span>
                  </div>

                  <div class="elf-plan-tagline">{{ p.tagline }}</div>

                  <div
                    class="elf-plan-hotel"
                    :class="{ 'is-link': p.hotel.id }"
                    @click.stop="gotoHotel(p)"
                  >
                    <span class="elf-hotel-text">
                      {{ p.hotel.name }}
                      <span v-if="p.hotel.price"> · ¥{{ p.hotel.price }}/晚</span>
                      <span v-if="p.hotel.star"> · {{ p.hotel.star }}星</span>
                    </span>
                    <span v-if="p.hotel.id" class="elf-hotel-link">查看详情 ›</span>
                  </div>

                  <div class="elf-plan-days">
                    <div v-for="d in p.days" :key="d.day" class="elf-plan-day">
                      <span class="elf-day-label">D{{ d.day }}</span>
                      <span class="elf-day-spots">
                        <template v-if="d.spots.length">
                          <template v-for="(s, si) in d.spots" :key="si">
                            <span
                              v-if="s.id"
                              class="elf-spot"
                              @click.stop="gotoSpot(s)"
                            >{{ s.name }}</span>
                            <span v-else>{{ s.name }}</span>
                            <span v-if="si < d.spots.length - 1" class="elf-spot-sep"> · </span>
                          </template>
                        </template>
                        <span v-else>自由活动 / 返程</span>
                      </span>
                    </div>
                  </div>

                  <!-- 超预算时系统自动做的调整 -->
                  <div v-if="p.adjustments && p.adjustments.length" class="elf-plan-adjust">
                    <span class="elf-adjust-tag">自动调整</span>
                    <span v-for="(a, ai) in p.adjustments" :key="ai" class="elf-adjust-item">{{ a }}</span>
                  </div>

                  <div class="elf-plan-scores">
                    <span>省钱 {{ scoreOf(m, p.id).cost }}</span>
                    <span>舒适 {{ scoreOf(m, p.id).comfort }}</span>
                    <span>体验 {{ scoreOf(m, p.id).experience }}</span>
                  </div>

                  <!-- 展开的预算明细 -->
                  <div v-if="isExpanded(i, p.id)" class="elf-plan-detail" @click.stop>
                    <div class="elf-detail-row">
                      <span>住宿</span>
                      <span>¥{{ p.hotel.price }} × {{ p.budget.nights }} 晚 = ¥{{ p.budget.hotel }}</span>
                    </div>
                    <div class="elf-detail-row">
                      <span>门票</span>
                      <span>¥{{ p.budget.tickets }}</span>
                    </div>
                    <div class="elf-detail-row">
                      <span>餐饮</span>
                      <span>¥{{ p.budget.food }}</span>
                    </div>
                    <div class="elf-detail-row is-total">
                      <span>合计</span>
                      <span>¥{{ p.budget.total }}</span>
                    </div>
                    <button class="elf-copy-btn" @click.stop="copyPlan(i, p)">
                      {{ copiedKey === planKey(i, p.id) ? '已复制' : '复制行程' }}
                    </button>
                  </div>
                  <div v-else class="elf-plan-more">点击查看预算明细</div>
                </div>

                <!-- 推荐理由：只有一个方案时不显示，避免"单选题" -->
                <div
                  v-if="m.plans.length > 1 && m.evaluation && m.evaluation.recommendation"
                  class="elf-reco-reason"
                >
                  推荐 {{ m.evaluation.recommendation.planId }}：{{ m.evaluation.recommendation.reason }}
                </div>
              </div>

              <!-- 多智能体执行记录：执行中展开，完成后自动收起成一行 -->
              <div v-if="m.steps && m.steps.length" class="elf-steps-box">
                <div
                  class="elf-steps-summary"
                  @click="m.stepsOpen = !m.stepsOpen"
                >
                  <span class="elf-step-check">✓</span>
                  <span class="elf-steps-text">
                    {{ m.streaming ? '正在执行…' : `已完成 ${m.steps.length} 个步骤` }}
                  </span>
                  <span class="elf-steps-toggle">{{ m.streaming || m.stepsOpen ? '收起' : '查看' }}</span>
                </div>

                <div v-if="m.streaming || m.stepsOpen" class="elf-steps">
                  <div
                    v-for="(s, si) in m.steps"
                    :key="si"
                    class="elf-step"
                    :class="{ 'is-running': s.status === 'running' }"
                  >
                    <span class="elf-step-dot"></span>
                    <span class="elf-step-label">{{ s.label }}</span>
                    <span class="elf-step-cost">{{ s.status === 'done' ? s.cost + 'ms' : '进行中' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 正在输入动画 -->
          <div v-if="sending" class="elf-msg is-ai">
            <img class="elf-msg-avatar" :src="elfImg" alt="" />
            <div class="elf-bubble elf-typing">
              <span></span><span></span><span></span>
              <em class="elf-typing-text">{{ mode === 'plan' ? '正在规划行程…' : '思考中…' }}</em>
            </div>
          </div>
        </div>

        <!-- 快捷示例：只在还没有生成过方案时显示，避免占用方案展示空间 -->
        <div v-if="!messages.some(m => m.type === 'plans')" class="elf-samples">
          <button
            v-for="s in samples"
            :key="s"
            class="elf-sample"
            @click="useSample(s)"
          >{{ s }}</button>
        </div>

        <!-- 输入区 -->
        <div class="elf-foot">
          <textarea
            v-model="input"
            class="elf-input"
            rows="1"
            placeholder="说说你的旅行计划…"
            @keydown="onKeydown"
          ></textarea>
          <button
            class="elf-send"
            :disabled="sending || !input.trim()"
            @click="send"
          >发送</button>
        </div>
      </div>
    </transition>

    <!-- 悬浮球 -->
    <transition name="ball">
      <button v-if="!open" class="elf-ball" @click="toggle" aria-label="打开旅行精灵">
        <img :src="elfImg" alt="小浣熊精灵" />
        <span class="elf-dot"></span>
      </button>
    </transition>
  </div>
</template>

<style scoped>
.elf-root {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;
}

/* ---------- 悬浮球 ---------- */
.elf-ball {
  position: relative;
  width: 68px;
  height: 68px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 6px 18px rgba(24, 95, 165, 0.28);
  transition: transform 0.2s ease;
}
.elf-ball:hover {
  transform: translateY(-3px) scale(1.05);
}
.elf-ball img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}
/* 右下角小红点，表示"在线" */
.elf-dot {
  position: absolute;
  right: 2px;
  bottom: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #e24b4a;
  border: 2px solid #fff;
}

/* ---------- 面板 ---------- */
.elf-panel {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 410px;
  height: 720px;
  max-height: calc(100vh - 48px);
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.elf-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #5F8B3E;
}
.elf-head-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #C6DCA8;
}
.elf-head-info { flex: 1; }
.elf-head-name {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}
.elf-head-sub {
  color: #C6DCA8;
  font-size: 12px;
  line-height: 1.3;
}
.elf-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

/* 模式切换 */
.elf-tabs {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: #f2f6fb;
  border-bottom: 1px solid #e5e7eb;
}
.elf-tab {
  flex: 1;
  border: 1px solid #d6e2f0;
  background: #fff;
  color: #5f6b7a;
  font-size: 13px;
  padding: 6px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.elf-tab.active {
  background: #5F8B3E;
  border-color: #5F8B3E;
  color: #fff;
  font-weight: 500;
}

/* 消息区 */
.elf-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  background: #f7f8fa;
}
.elf-msg {
  display: flex;
  margin-bottom: 14px;
  gap: 8px;
}
.elf-msg.is-user {
  justify-content: flex-end;
}
.elf-msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
}
.elf-bubble-wrap {
  max-width: 78%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* 方案卡片需要占满宽度，不受气泡 78% 限制 */
.elf-bubble-wrap.is-plans {
  max-width: 100%;
  width: 100%;
}

/* ---------- 三个候选方案 ---------- */
.elf-plans {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.elf-thinking {
  background: #f7f8fa;
  border: 1px dashed #d3d1c7;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #5f6b7a;
}
.elf-thinking-tag {
  display: inline-block;
  background: #EAF2DF;
  color: #5F8B3E;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 6px;
}

.elf-plan {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}
.elf-plan:hover {
  border-color: #C6DCA8;
}
.elf-plan.is-open {
  border-color: #5F8B3E;
}
.elf-plan-more {
  font-size: 11px;
  color: #9aa4b2;
  text-align: right;
}
/* 展开后的预算明细 */
.elf-plan-detail {
  border-top: 1px dashed #e4ebf3;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: default;
}
.elf-detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #5f6b7a;
}
.elf-detail-row.is-total {
  border-top: 1px solid #eef0f3;
  padding-top: 5px;
  margin-top: 2px;
  font-weight: 600;
  color: #5F8B3E;
  font-size: 13px;
}
.elf-copy-btn {
  margin-top: 4px;
  align-self: flex-end;
  border: 1px solid #5F8B3E;
  background: #fff;
  color: #5F8B3E;
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
}
.elf-copy-btn:hover {
  background: #EAF2DF;
}
.elf-plan.is-reco {
  border-color: #5F8B3E;
  background: #fbfdff;
}
.elf-plan-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.elf-plan-id {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #5F8B3E;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.elf-plan-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2328;
}
.elf-reco-tag {
  font-size: 10px;
  background: #5F8B3E;
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
}
.elf-plan-total {
  margin-left: auto;
  font-size: 15px;
  font-weight: 600;
  color: #5F8B3E;
}
.elf-plan-tagline {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}
.elf-plan-hotel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #374151;
  background: #f7f8fa;
  border-radius: 6px;
  padding: 4px 8px;
  line-height: 1.5;
}
.elf-plan-hotel.is-link {
  cursor: pointer;
  transition: background 0.15s ease;
}
.elf-plan-hotel.is-link:hover {
  background: #EAF2DF;
}
.elf-hotel-text {
  flex: 1;
  min-width: 0;
}
.elf-hotel-link {
  color: #5F8B3E;
  font-size: 11px;
  flex-shrink: 0;
}
.elf-plan-days {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.elf-plan-day {
  display: flex;
  gap: 6px;
  font-size: 12px;
  align-items: flex-start;
}
.elf-day-label {
  flex-shrink: 0;
  background: #eef4fb;
  color: #5F8B3E;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
}
.elf-day-spots {
  color: #374151;
  line-height: 1.5;
}
/* 行程里的景点名可点击跳详情 */
.elf-spot {
  color: #5F8B3E;
  cursor: pointer;
  border-bottom: 1px dashed #C6DCA8;
  transition: border-color 0.15s ease;
}
.elf-spot:hover {
  color: #3F6129;
  border-bottom-color: #5F8B3E;
}
.elf-spot-sep {
  color: #b4b2a9;
}
.elf-plan-scores {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #6b7280;
  border-top: 1px dashed #eef0f3;
  padding-top: 6px;
}
/* 超预算自动调整记录 */
.elf-plan-adjust {
  background: #fffbeb;
  border-left: 3px solid #ef9f27;
  border-radius: 0 6px 6px 0;
  padding: 6px 9px;
  font-size: 11px;
  color: #854f0b;
  line-height: 1.6;
}
.elf-adjust-tag {
  font-weight: 600;
  margin-right: 4px;
}
.elf-adjust-item {
  display: block;
}
.elf-reco-reason {
  background: #EAF2DF;
  border-left: 3px solid #5F8B3E;
  border-radius: 0 6px 6px 0;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #3F6129;
}
.elf-bubble {
  max-width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}
/* **加粗** 渲染后的样式 */
.elf-bold {
  font-weight: 600;
  color: #1f2328;
}

/* 多智能体执行步骤 */
.elf-steps-box {
  background: #fff;
  border: 1px dashed #c9d8ea;
  border-radius: 10px;
  overflow: hidden;
}
.elf-steps-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #5f6b7a;
  cursor: pointer;
  user-select: none;
}
.elf-step-check {
  color: #3b9e6f;
  font-size: 12px;
}
.elf-steps-text { flex: 1; }
.elf-steps-toggle {
  color: #5F8B3E;
  font-size: 11px;
}
.elf-steps {
  background: #fff;
  border-top: 1px dashed #e4ebf3;
  border-radius: 0;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.elf-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #5f6b7a;
}
.elf-step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b9e6f;
  flex-shrink: 0;
}
/* 进行中：蓝点 + 呼吸闪烁 */
.elf-step.is-running .elf-step-dot {
  background: #5F8B3E;
  animation: elf-pulse 1s ease-in-out infinite;
}
.elf-step.is-running .elf-step-cost {
  color: #5F8B3E;
}
@keyframes elf-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
.elf-step-label { flex: 1; }
.elf-step-cost {
  color: #9aa4b2;
  font-size: 11px;
}
.elf-msg.is-ai .elf-bubble {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-top-left-radius: 4px;
  color: #1f2328;
}
.elf-msg.is-user .elf-bubble {
  background: #5F8B3E;
  color: #fff;
  border-top-right-radius: 4px;
}

/* 正在输入三点动画 */
.elf-typing {
  display: flex;
  gap: 5px;
  align-items: center;
}
.elf-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b0b6c0;
  animation: elf-blink 1.2s infinite;
}
.elf-typing span:nth-child(2) { animation-delay: 0.2s; }
.elf-typing span:nth-child(3) { animation-delay: 0.4s; }
.elf-typing-text {
  font-style: normal;
  font-size: 12px;
  color: #8a94a3;
  margin-left: 4px;
}
@keyframes elf-blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

/* 快捷示例 */
.elf-samples {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 14px 10px;
  background: #f7f8fa;
}
.elf-sample {
  font-size: 12px;
  color: #5F8B3E;
  background: #EAF2DF;
  border: none;
  border-radius: 14px;
  padding: 6px 12px;
  cursor: pointer;
}

/* 输入区 */
.elf-foot {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.elf-input {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
  max-height: 90px;
}
.elf-input:focus {
  border-color: #5F8B3E;
}
.elf-send {
  border: none;
  background: #5F8B3E;
  color: #fff;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}
.elf-send:disabled {
  background: #C6DCA8;
  cursor: not-allowed;
}

/* ---------- 过渡动画 ---------- */
.panel-enter-active, .panel-leave-active {
  transition: all 0.24s ease;
}
.panel-enter-from, .panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
  transform-origin: bottom right;
}
.ball-enter-active, .ball-leave-active {
  transition: all 0.2s ease;
}
.ball-enter-from, .ball-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

/* ---------- 移动端：面板铺满 ---------- */
@media (max-width: 768px) {
  .elf-root {
    right: 12px;
    bottom: 12px;
  }
  .elf-panel {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
  }
}
</style>
