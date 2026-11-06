/**
 * 统一的请求封装。
 *
 * 约定：后端所有接口都返回 { code, message, data }，
 * code === 0 表示成功；分页接口还会在顶层带上 total / page / pageSize / totalPages。
 */

const TOKEN_KEY = 'vue222t_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/** 去掉空值，数组用逗号拼接（后端 toArray 能识别） */
function toQueryString(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      if (!value.length) return
      search.append(key, value.join(','))
      return
    }
    search.append(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export class RequestError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'RequestError'
    this.code = code
  }
}

export async function request(url, { method = 'GET', params, data } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`/api${url}${toQueryString(params)}`, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data)
    })
  } catch (err) {
    throw new RequestError('无法连接后端服务，请确认 vue222t-server 已启动（默认 3000 端口）', -1)
  }

  let payload = null
  try {
    payload = await response.json()
  } catch (err) {
    throw new RequestError(`响应格式异常（HTTP ${response.status}）`, response.status)
  }

  if (payload.code !== 0) {
    // token 失效就清掉，避免一直带着坏 token 请求
    if (payload.code === 401) setToken('')
    throw new RequestError(payload.message || '请求失败', payload.code)
  }

  return payload
}

export const http = {
  get: (url, params) => request(url, { method: 'GET', params }),
  post: (url, data, params) => request(url, { method: 'POST', data, params }),
  put: (url, data) => request(url, { method: 'PUT', data })
}
