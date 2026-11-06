'use strict'

/**
 * 端到端交互测试（真实浏览器驱动，不依赖 playwright）
 *
 * 覆盖：侧边栏跳转 → 各业务线页面 → 下单 → 订单管理 → 刷新持久化。
 * 通过 Chrome DevTools Protocol 直接操作 Edge/Chrome，自动启停浏览器。
 *
 * 前置：前端 dev server 已启动（npm run dev）
 * 运行：npm run e2e
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const APP = process.env.APP_URL || 'http://localhost:8080'
const PORT = Number(process.env.CDP_PORT || 9333)
const PROFILE_DIR = path.join(os.tmpdir(), 'vue222t-e2e-profile')

const BROWSER_CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ *
 * 断言
 * ------------------------------------------------------------------ */
let passed = 0
let failed = 0
const failures = []

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } else {
    failed += 1
    failures.push(name)
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const section = (title) => console.log(`\n\x1b[36m${title}\x1b[0m`)

/* ------------------------------------------------------------------ *
 * CDP 客户端
 * ------------------------------------------------------------------ */
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let seq = 0
  const pending = new Map()

  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error('无法连接调试端口'))
  })

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
  }

  return {
    ready,
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++seq
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      }),
    close: () => ws.close()
  }
}

/* ------------------------------------------------------------------ *
 * 启动浏览器
 * ------------------------------------------------------------------ */
function findBrowser() {
  const hit = BROWSER_CANDIDATES.find((p) => fs.existsSync(p))
  if (!hit) throw new Error('没找到 Edge / Chrome，可用 BROWSER_PATH 环境变量指定')
  return hit
}

async function waitForCdp(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return true
    } catch (err) {
      /* 还没起来，继续等 */
    }
    await sleep(400)
  }
  throw new Error('调试端口未就绪')
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */
async function main() {
  const browserPath = findBrowser()
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true })

  console.log(`\n浏览器：${browserPath}`)
  console.log(`应用：${APP}\n`)

  const browser = spawn(
    browserPath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--hide-scrollbars',
      '--window-size=1600,1000',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      'about:blank'
    ],
    { stdio: 'ignore' }
  )

  let client
  try {
    await waitForCdp()

    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    const page = list.find((t) => t.type === 'page')
    if (!page) throw new Error('找不到浏览器页面')

    client = connect(page.webSocketDebuggerUrl)
    await client.ready
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false
    })

    const evaluate = async (expression) => {
      const result = await client.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true
      })
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text)
      }
      return result.result.value
    }

    const goto = async (hash) => {
      await client.send('Page.navigate', { url: `${APP}/#/${hash}` })
      await sleep(3200)
    }

    const clickByText = (selector, text) => `
      (() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
          .find(e => e.textContent.includes(${JSON.stringify(text)}))
        if (!el) return false
        el.click()
        return true
      })()
    `

    const readOrders = async (bucket = 'vue222t_orders_guest') =>
      JSON.parse((await evaluate(`localStorage.getItem('${bucket}')`)) || '[]')

    const orderBuckets = async () =>
      JSON.parse(
        await evaluate(
          `JSON.stringify(Object.keys(localStorage).filter(k => k.startsWith('vue222t_orders')))`
        )
      )

    /* ---------------- 侧边栏与业务线页面 ---------------- */
    section('一、侧边栏与业务线页面')

    await goto('hotel')
    // 清掉所有订单桶（游客 + 各账号）和登录态
    await evaluate(`
      (() => {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('vue222t_orders'))
          .forEach((k) => localStorage.removeItem(k))
        localStorage.removeItem('vue222t_token')
      })()
    `)
    await client.send('Page.reload')
    await sleep(3200)

    const menus = JSON.parse(
      await evaluate(
        `JSON.stringify([...document.querySelectorAll('.aside .el-menu-item')].map(el => el.textContent.trim()))`
      )
    )
    check(`侧边栏渲染 ${menus.length} 条业务线`, menus.length === 8, menus.join('/'))
    check(
      '包含全部 8 条业务线',
      ['酒店', '飞机票', '火车票', '旅游', '景点', '汽车票', '船票', '门票'].every((m) =>
        menus.includes(m)
      )
    )

    const hotelTitle = await evaluate(`document.querySelector('.page-head h2')?.textContent.trim()`)
    check('酒店页标题正确', /酒店/.test(hotelTitle || ''), hotelTitle)

    const filters = JSON.parse(
      await evaluate(
        `JSON.stringify([...document.querySelectorAll('.topfilter h5')].map(el => el.textContent.trim()))`
      )
    )
    check('酒店筛选项已渲染', filters.includes('星级价格') && filters.includes('酒店设施'), filters.join('/'))
    check(
      '「区域位置」已移除',
      !filters.some((t) => /区域位置|热门筛选|机场车站|商业区/.test(t)),
      filters.join('/')
    )

    const cards = await evaluate(`document.querySelectorAll('.r-left ul > li').length`)
    check('酒店列表有数据', cards > 0, `${cards} 条`)

    // 逐条业务线都点一遍，确认各自页面能出数据、且有自己专属的搜索字段/筛选项
    for (const [label, keyword] of [
      ['飞机票', '出发城市'],
      ['火车票', '出发站'],
      ['旅游', '目的地'],
      ['景点', '景区等级'],
      ['汽车票', '出发城市'],
      ['船票', '出发港'],
      ['门票', '票种']
    ]) {
      await goto('hotel')
      await evaluate(clickByText('.aside .el-menu-item', label))
      await sleep(2400)

      const hash = await evaluate(`location.hash`)
      const count = await evaluate(`document.querySelectorAll('.r-left ul > li').length`)
      // 关键词可能出现在搜索条（如「出发城市」）或筛选条（如「景区等级」），两边都查
      const hasField = await evaluate(`
        (() => {
          const texts = [
            ...[...document.querySelectorAll('.searchlist-item label')].map(e => e.textContent),
            ...[...document.querySelectorAll('.topfilter h5')].map(e => e.textContent)
          ]
          return texts.some(t => t.includes(${JSON.stringify(keyword)}))
        })()
      `)

      check(`${label}页跳转后有数据`, count > 0, `hash=${hash} 条数=${count}`)
      check(`${label}页含专属字段「${keyword}」`, hasField === true)
    }

    /* ---------------- 卡片信息是否贴合业务 ---------------- */
    section('二、卡片信息贴合业务')

    await goto('flight')
    check(
      '机票卡片不显示评分块',
      (await evaluate(`!document.querySelector('.product-list li .l-r-s')`)) === true
    )
    check(
      '机票卡片不出现「棒极了 / 条评价」',
      (await evaluate(`!document.querySelector('.product-list')?.textContent.includes('评价')`)) === true
    )
    check(
      '机票卡片改显示准点率 / 余票',
      (await evaluate(`
        (() => {
          const el = document.querySelector('.product-list li .list-r-stat')
          return el ? el.textContent.replace(/\\s+/g, '') : ''
        })()
      `)) .includes('准点率') === true
    )

    await goto('train')
    check(
      '火车票卡片不显示评分',
      (await evaluate(`!document.querySelector('.product-list li .l-r-s')`)) === true
    )

    await goto('hotel')
    check(
      '酒店卡片仍然显示评分',
      (await evaluate(`!!document.querySelector('.product-list li .l-r-s')`)) === true
    )

    /* ---------------- 分页 ---------------- */
    section('三、分页')

    const pagerBox = await evaluate(`
      (() => {
        const li = document.querySelector('.list-pagination .el-pager li')
        if (!li) return 'null'
        const r = li.getBoundingClientRect()
        return JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) })
      })()
    `)
    const pager = pagerBox === 'null' ? null : JSON.parse(pagerBox)
    check(
      '分页按钮是方块而不是 150px 竖条',
      pager && pager.h <= 40 && pager.w <= 40,
      JSON.stringify(pager)
    )

    // Element Plus 只渲染 pager-count 个页码 + 省略号，不是全部 li，所以查总数和末页
    const pagerTotalText = await evaluate(
      `document.querySelector('.list-pagination .el-pagination__total')?.textContent.trim()`
    )
    check('分页显示总条数 88', /88/.test(pagerTotalText || ''), pagerTotalText)

    const lastPageVisible = await evaluate(`
      [...document.querySelectorAll('.list-pagination .el-pager li')]
        .some(el => el.textContent.trim() === '9')
    `)
    check('88 条可翻到第 9 页', lastPageVisible === true)

    /* ---------------- 下单（游客） ---------------- */
    section('四、下单流程（未登录）')

    await goto('hotel')
    check('点击「立即预订」', await evaluate(clickByText('.r-left ul > li button', '立即预订')))
    await sleep(900)
    check('下单弹窗已打开', await evaluate(`Boolean(document.querySelector('.el-dialog'))`))

    const filled = await evaluate(`
      (() => {
        const set = (el, value) => {
          const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set
          setter.call(el, value)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
        const name = document.querySelector('.el-dialog input[placeholder="请输入姓名"]')
        const phone = document.querySelector('.el-dialog input[placeholder="11 位手机号"]')
        if (!name || !phone) return false
        set(name, '测试用户')
        set(phone, '13900001234')
        return true
      })()
    `)
    check('联系人表单可填写', filled === true)
    await sleep(400)

    const bill = await evaluate(`document.querySelector('.el-dialog .bill-row.total strong')?.textContent.trim()`)
    check('费用明细已计算', /^¥\d+$/.test(bill || ''), bill)

    check('点击「提交订单」', await evaluate(clickByText('.el-dialog button', '提交订单')))
    await sleep(1200)

    const orders = await readOrders('vue222t_orders_guest')
    check('订单已写入【游客桶】', orders.length === 1, `${orders.length} 条`)

    const order = orders[0] || {}
    check('订单号已生成', /^VT\d{13}$/.test(order.orderNo || ''), order.orderNo)
    check('初始状态为待付款', order.status === 'PENDING_PAY', order.status)
    check('金额 = 单价 × 单位数', order.totalPrice === order.unitPrice * order.units, String(order.totalPrice))
    check('记录了联系人', order.guestName === '测试用户' && order.guestPhone === '13900001234')

    /* ---------------- 订单管理 ---------------- */
    section('五、订单管理')

    await goto('orders')
    check('订单页渲染出卡片', (await evaluate(`document.querySelectorAll('.order-card').length`)) === 1)
    check(
      '状态显示为待付款',
      (await evaluate(`document.querySelector('.order-card .order-status')?.textContent.trim()`)) === '待付款'
    )
    check(
      '未登录时标注「本机游客订单」',
      (await evaluate(`document.querySelector('.scope-tag')?.textContent.trim()`)) === '本机游客订单'
    )
    check('未登录时给出订单归属提示', (await evaluate(`!!document.querySelector('.scope-hint')`)) === true)

    check('点击「去支付」', await evaluate(clickByText('.order-card button', '去支付')))
    await sleep(900)
    const paid = await readOrders('vue222t_orders_guest')
    check('支付后状态变为 PAID', paid[0]?.status === 'PAID', paid[0]?.status)

    check('点击「取消」', await evaluate(clickByText('.order-card button', '取消')))
    await sleep(700)
    check('弹出确认框并可确认', await evaluate(clickByText('.el-message-box button', '确定取消')))
    await sleep(900)

    const cancelled = await readOrders('vue222t_orders_guest')
    check('取消后状态变为 CANCELLED', cancelled[0]?.status === 'CANCELLED', cancelled[0]?.status)

    await goto('orders')
    check(
      '刷新后订单仍在（localStorage 持久化）',
      (await evaluate(`document.querySelectorAll('.order-card').length`)) === 1
    )

    check('可切换状态 Tab', await evaluate(clickByText('.status-tabs .el-tabs__item', '待付款')))
    await sleep(700)
    check(
      '已取消订单不出现在「待付款」下',
      (await evaluate(`document.querySelectorAll('.order-card').length`)) === 0
    )

    /* ---------------- 订单按账号隔离 ---------------- */
    section('六、订单按账号隔离')

    // 登录 demo 账号
    await goto('hotel')
    check('打开登录弹窗', await evaluate(clickByText('.header-right .el-link', '请登录')))
    await sleep(900)
    check('点击登录', await evaluate(clickByText('.el-dialog button', '登 录')))
    await sleep(1500)

    const loggedIn = await evaluate(
      `!!document.querySelector('.header-right')?.textContent.includes('演示用户')`
    )
    check('demo 登录成功', loggedIn === true)

    // demo 名下应该没有任何订单（游客那一单不该串进来）
    await goto('orders')
    check(
      'demo 看不到游客下单的订单',
      (await evaluate(`document.querySelectorAll('.order-card').length`)) === 0,
      `实际 ${await evaluate(`document.querySelectorAll('.order-card').length`)} 张`
    )
    check(
      '登录后标注为账号订单',
      (await evaluate(`document.querySelector('.scope-tag')?.textContent.trim()`)) === '演示用户 的订单'
    )
    check('登录后不再显示游客提示', (await evaluate(`!document.querySelector('.scope-hint')`)) === true)

    // demo 自己下一单
    await goto('hotel')
    check('demo 点击「立即预订」', await evaluate(clickByText('.product-list li button', '立即预订')))
    await sleep(900)
    await evaluate(`
      (() => {
        const set = (el, value) => {
          const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set
          setter.call(el, value)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
        const name = document.querySelector('.el-dialog input[placeholder="请输入姓名"]')
        const phone = document.querySelector('.el-dialog input[placeholder="11 位手机号"]')
        if (name) set(name, '演示用户')
        if (phone) set(phone, '13800138000')
      })()
    `)
    await sleep(400)
    check('demo 提交订单', await evaluate(clickByText('.el-dialog button', '提交订单')))
    await sleep(1200)

    const buckets = await orderBuckets()
    check(
      '两个账号的订单分别存在不同的桶里',
      buckets.includes('vue222t_orders_guest') && buckets.includes('vue222t_orders_u1'),
      buckets.join(', ')
    )
    check('游客桶仍是最初那 1 条', (await readOrders('vue222t_orders_guest')).length === 1)
    check('demo 桶是自己的 1 条', (await readOrders('vue222t_orders_u1')).length === 1)

    // 退出登录，应回到游客订单
    await goto('hotel')
    check('点击「退出」', await evaluate(clickByText('.header-right .el-link', '退出')))
    await sleep(1200)
    await goto('orders')
    check(
      '退出后回到游客订单（1 条）',
      (await evaluate(`document.querySelectorAll('.order-card').length`)) === 1
    )
    check(
      '退出后标注回到「本机游客订单」',
      (await evaluate(`document.querySelector('.scope-tag')?.textContent.trim()`)) === '本机游客订单'
    )

    /* ---------------- 注册 ---------------- */
    section('七、注册新账号')

    await goto('hotel')
    check('点击「注册」', await evaluate(clickByText('.header-right .el-link', '注册')))
    await sleep(900)
    check('注册弹窗已打开', await evaluate(`Boolean(document.querySelector('.el-dialog'))`))
    check('含确认密码字段', await evaluate(`Boolean(document.querySelector('.el-dialog input[placeholder="确认密码"]'))`))
    check('含手机号字段', await evaluate(`Boolean(document.querySelector('.el-dialog input[placeholder="手机号（选填）"]'))`))

    const newUser = `tester${Date.now().toString().slice(-6)}`
    await evaluate(`
      (() => {
        const set = (el, value) => {
          const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set
          setter.call(el, value)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
        const q = (p) => document.querySelector('.el-dialog input[placeholder="' + p + '"]')
        set(q('用户名（3-20 位字母/数字/下划线）'), ${JSON.stringify(newUser)})
        set(q('密码（至少 6 位）'), 'test123456')
        set(q('确认密码'), 'test123456')
      })()
    `)
    await sleep(400)
    check('提交注册', await evaluate(clickByText('.el-dialog button', '注册并登录')))
    await sleep(2200)

    check(
      '注册后自动登录',
      (await evaluate(`!!document.querySelector('.header-right')?.textContent.includes(${JSON.stringify(newUser)})`)) === true,
      newUser
    )

    await goto('orders')
    check(
      '新账号看不到任何别人的订单',
      (await evaluate(`document.querySelectorAll('.order-card').length`)) === 0
    )

    // 新账号下一单，验证会落到第三个独立的桶里
    await goto('hotel')
    await evaluate(clickByText('.product-list li button', '立即预订'))
    await sleep(900)
    await evaluate(`
      (() => {
        const set = (el, value) => {
          const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set
          setter.call(el, value)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
        const name = document.querySelector('.el-dialog input[placeholder="请输入姓名"]')
        const phone = document.querySelector('.el-dialog input[placeholder="11 位手机号"]')
        if (name) set(name, '新用户')
        if (phone) set(phone, '13700007777')
      })()
    `)
    await sleep(400)
    await evaluate(clickByText('.el-dialog button', '提交订单'))
    await sleep(1200)

    const finalBuckets = (await orderBuckets()).sort()
    check(
      '三个桶各自独立（游客 / demo / 新账号）',
      finalBuckets.length === 3,
      finalBuckets.join(', ')
    )
    check('游客桶仍是 1 条', (await readOrders('vue222t_orders_guest')).length === 1)
    check('demo 桶仍是 1 条', (await readOrders('vue222t_orders_u1')).length === 1)

    const newBucket = finalBuckets.find((k) => !k.endsWith('_guest') && k !== 'vue222t_orders_u1')
    check('新账号桶只有自己的 1 条', newBucket && (await readOrders(newBucket)).length === 1, newBucket)
    check(
      '新账号订单里没有别人的联系人',
      newBucket
        ? (await readOrders(newBucket))[0].guestName === '新用户'
        : false
    )
  } finally {
    if (client) client.close()
    browser.kill()
    await sleep(600)
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true })
  }

  console.log('\n' + '─'.repeat(46))
  console.log(`通过 \x1b[32m${passed}\x1b[0m 项，失败 \x1b[31m${failed}\x1b[0m 项`)
  if (failed) {
    console.log('\n失败用例：')
    failures.forEach((f) => console.log(`  · ${f}`))
    process.exit(1)
  }
  console.log('全部通过 \x1b[0m✔\n')
}

main().catch((err) => {
  console.error('\n端到端测试异常：', err.message)
  console.error('请确认前端已启动：npm run dev')
  process.exit(1)
})
