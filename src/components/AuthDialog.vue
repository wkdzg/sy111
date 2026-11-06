<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi, setToken } from '@/api'
import { userStore } from '@/store'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 从订单页点进来时默认展示注册 */
  defaultTab: { type: String, default: 'login' }
})

const emit = defineEmits(['update:modelValue', 'success'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const tab = ref('login')
const loading = ref(false)

const loginForm = reactive({ username: 'demo', password: '123456' })
const registerForm = reactive({ username: '', password: '', confirm: '', nickname: '', phone: '' })

watch(visible, (open) => {
  if (open) tab.value = props.defaultTab
})

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/
const PHONE_RE = /^1[3-9]\d{9}$/

function validateRegister() {
  const f = registerForm
  if (!USERNAME_RE.test(f.username)) return '用户名需 3-20 位字母、数字或下划线'
  if (f.password.length < 6) return '密码至少 6 位'
  if (f.password !== f.confirm) return '两次输入的密码不一致'
  if (f.phone && !PHONE_RE.test(f.phone)) return '手机号格式不正确'
  return ''
}

async function submitLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  loading.value = true
  try {
    const { data } = await authApi.login(loginForm)
    setToken(data.accessToken)
    userStore.setUser(data.user)
    ElMessage.success(`欢迎回来，${data.user.nickname || data.user.username}`)
    visible.value = false
    emit('success', data.user)
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    loading.value = false
  }
}

async function submitRegister() {
  const error = validateRegister()
  if (error) {
    ElMessage.warning(error)
    return
  }

  loading.value = true
  try {
    await authApi.register({
      username: registerForm.username,
      password: registerForm.password,
      nickname: registerForm.nickname || registerForm.username,
      phone: registerForm.phone || undefined
    })

    ElMessage.success('注册成功，正在自动登录')

    // 注册完直接登录，少一步操作
    const { data } = await authApi.login({
      username: registerForm.username,
      password: registerForm.password
    })
    setToken(data.accessToken)
    userStore.setUser(data.user)
    visible.value = false
    emit('success', data.user)
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="420px"
    :title="tab === 'login' ? '登录' : '注册新账号'"
    align-center
    class="auth-dialog"
  >
    <el-tabs v-model="tab" stretch>
      <!-- ---------------- 登录 ---------------- -->
      <el-tab-pane label="登录" name="login">
        <el-form label-width="0" class="auth-form" @submit.prevent>
          <el-form-item>
            <el-input v-model="loginForm.username" size="large" placeholder="用户名" clearable />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="loginForm.password"
              size="large"
              type="password"
              placeholder="密码"
              show-password
              @keyup.enter="submitLogin"
            />
          </el-form-item>
        </el-form>

        <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="submitLogin">
          登 录
        </el-button>

        <p class="tip">
          演示账号 <code>demo</code> / <code>123456</code>，已预填，直接点登录即可
        </p>
      </el-tab-pane>

      <!-- ---------------- 注册 ---------------- -->
      <el-tab-pane label="注册" name="register">
        <el-form label-width="0" class="auth-form" @submit.prevent>
          <el-form-item>
            <el-input v-model="registerForm.username" size="large" placeholder="用户名（3-20 位字母/数字/下划线）" clearable />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.password" size="large" type="password" placeholder="密码（至少 6 位）" show-password />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.confirm" size="large" type="password" placeholder="确认密码" show-password />
          </el-form-item>
          <el-form-item>
            <el-input v-model="registerForm.nickname" size="large" placeholder="昵称（选填）" clearable />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="registerForm.phone"
              size="large"
              placeholder="手机号（选填）"
              maxlength="11"
              clearable
              @keyup.enter="submitRegister"
            />
          </el-form-item>
        </el-form>

        <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="submitRegister">
          注册并登录
        </el-button>

        <p class="tip">注册后会自动登录，方便直接下单</p>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<style scoped>
.auth-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
  letter-spacing: 2px;
}

.tip {
  margin: 14px 0 0;
  text-align: center;
  font-size: 12px;
  color: #909399;
}

.tip code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  font-family: var(--font-mono, monospace);
}
</style>
