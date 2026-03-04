<template>
  <div class="auth-container">
    <div class="auth-box">
      <div class="auth-header">
        <div class="logo">✓</div>
        <h2>Lzuea Todo</h2>
        <p>{{ isLogin ? '登录到您的账户' : '创建新账户' }}</p>
      </div>

      <a-form
        :model="formState"
        @finish="handleSubmit"
        layout="vertical"
        class="auth-form"
      >
        <a-form-item
          label="用户名"
          name="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input
            v-model:value="formState.username"
            placeholder="输入用户名"
            size="large"
          >
            <template #prefix>
              <user-outlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="formState.password"
            placeholder="输入密码"
            size="large"
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item
          v-if="!isLogin"
          label="确认密码"
          name="confirmPassword"
          :rules="[{ required: !isLogin, message: '请确认密码' }]"
        >
          <a-input-password
            v-model:value="formState.confirmPassword"
            placeholder="再次输入密码"
            size="large"
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item
          v-if="!isLogin"
          label="邮箱（可选）"
          name="email"
        >
          <a-input
            v-model:value="formState.email"
            placeholder="输入邮箱（可选）"
            size="large"
          >
            <template #prefix>
              <mail-outlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="loading"
          >
            {{ isLogin ? '登录' : '注册' }}
          </a-button>
        </a-form-item>
      </a-form>

      <div class="auth-footer">
        <p>
          {{ isLogin ? '还没有账户？' : '已有账户？' }}
          <a @click="toggleMode">{{ isLogin ? '立即注册' : '立即登录' }}</a>
        </p>
        
        <a-divider />
        
        <a-button type="link" block @click="useLocalMode">
          使用本地模式（无需登录）
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const authStore = useAuthStore()
const isLogin = ref(true)
const loading = ref(false)

const formState = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  email: ''
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
  formState.confirmPassword = ''
  formState.email = ''
}

const handleSubmit = async () => {
  if (!isLogin.value && formState.password !== formState.confirmPassword) {
    message.error('两次输入的密码不一致')
    return
  }

  loading.value = true
  
  try {
    if (isLogin.value) {
      await authStore.login(formState.username, formState.password)
      message.success('登录成功！')
    } else {
      await authStore.register(formState.username, formState.password, formState.email)
      message.success('注册成功！')
    }
  } catch (error: any) {
    message.error(error.message || (isLogin.value ? '登录失败' : '注册失败'))
  } finally {
    loading.value = false
  }
}

const useLocalMode = () => {
  authStore.setLocalMode()
}
</script>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.auth-box {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  margin: 0 auto 16px;
}

.auth-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #333;
}

.auth-header p {
  margin: 0;
  color: #666;
}

.auth-form {
  margin-bottom: 24px;
}

.auth-footer {
  text-align: center;
}

.auth-footer p {
  margin: 0 0 16px;
  color: #666;
}

.auth-footer a {
  color: #667eea;
  cursor: pointer;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
