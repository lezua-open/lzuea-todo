const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const mysql = require('mysql2/promise')
const dbConfig = require('./config')

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = 'lzuea-todo-secret-key-change-in-production'

// 中间件
app.use(cors())
app.use(express.json())

// 数据库连接池
const pool = mysql.createPool(dbConfig)

// 认证中间件
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: '未登录' })
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: '登录已过期' })
  }
}

// ============ 用户相关 API ============

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码必填' })
    }
    
    // 检查用户是否存在
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )
    
    if (existing.length > 0) {
      return res.status(409).json({ error: '用户名已存在' })
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)
    const userId = uuidv4()
    
    // 创建用户
    await pool.execute(
      'INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)',
      [userId, username, hashedPassword, email || null]
    )
    
    // 生成 Token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({
      success: true,
      token,
      user: { id: userId, username, email }
    })
  } catch (error) {
    console.error('注册失败:', error)
    res.status(500).json({ error: '注册失败' })
  }
})

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    // 查找用户
    const [users] = await pool.execute(
      'SELECT id, username, password, email FROM users WHERE username = ?',
      [username]
    )
    
    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    
    const user = users[0]
    
    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    
    // 生成 Token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    
    // 更新最后同步时间
    await pool.execute(
      'UPDATE users SET last_sync_at = NOW() WHERE id = ?',
      [user.id]
    )
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ error: '登录失败' })
  }
})

// 获取用户信息
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, last_sync_at FROM users WHERE id = ?',
      [req.userId]
    )
    
    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    res.json({ user: users[0] })
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

// ============ 待办事项 API ============

// 获取用户的所有待办
app.get('/api/todos', authMiddleware, async (req, res) => {
  try {
    const [todos] = await pool.execute(
      `SELECT id, text, completed, created_at, updated_at, deleted 
       FROM todos 
       WHERE user_id = ? AND deleted = FALSE
       ORDER BY created_at DESC`,
      [req.userId]
    )
    
    res.json({ todos })
  } catch (error) {
    console.error('获取待办失败:', error)
    res.status(500).json({ error: '获取待办失败' })
  }
})

// 创建待办
app.post('/api/todos', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body
    const todoId = uuidv4()
    
    await pool.execute(
      'INSERT INTO todos (id, user_id, text) VALUES (?, ?, ?)',
      [todoId, req.userId, text]
    )
    
    const [todos] = await pool.execute(
      'SELECT * FROM todos WHERE id = ?',
      [todoId]
    )
    
    res.json({ success: true, todo: todos[0] })
  } catch (error) {
    console.error('创建待办失败:', error)
    res.status(500).json({ error: '创建待办失败' })
  }
})

// 更新待办
app.put('/api/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { text, completed } = req.body
    
    await pool.execute(
      'UPDATE todos SET text = ?, completed = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [text, completed, id, req.userId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('更新待办失败:', error)
    res.status(500).json({ error: '更新待办失败' })
  }
})

// 删除待办（软删除）
app.delete('/api/todos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    
    await pool.execute(
      'UPDATE todos SET deleted = TRUE, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [id, req.userId]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('删除待办失败:', error)
    res.status(500).json({ error: '删除待办失败' })
  }
})

// ============ 同步 API ============

// 批量同步（上传本地数据，下载云端数据）
app.post('/api/sync', authMiddleware, async (req, res) => {
  try {
    const { todos: localTodos, lastSyncAt } = req.body
    
    // 1. 上传本地数据到云端
    for (const todo of localTodos) {
      await pool.execute(
        `INSERT INTO todos (id, user_id, text, completed, created_at, updated_at, deleted) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         text = VALUES(text),
         completed = VALUES(completed),
         updated_at = VALUES(updated_at),
         deleted = VALUES(deleted)`,
        [todo.id, req.userId, todo.text, todo.completed, 
         new Date(todo.createdAt), new Date(todo.updatedAt), todo.deleted || false]
      )
    }
    
    // 2. 下载云端更新的数据
    const [cloudTodos] = await pool.execute(
      `SELECT id, text, completed, created_at, updated_at, deleted 
       FROM todos 
       WHERE user_id = ? AND (updated_at > ? OR ? IS NULL)
       ORDER BY updated_at DESC`,
      [req.userId, lastSyncAt || '1970-01-01', lastSyncAt]
    )
    
    // 3. 记录同步日志
    await pool.execute(
      'INSERT INTO sync_logs (user_id, sync_type, items_count) VALUES (?, ?, ?)',
      [req.userId, 'full', localTodos.length + cloudTodos.length]
    )
    
    // 4. 更新用户最后同步时间
    await pool.execute(
      'UPDATE users SET last_sync_at = NOW() WHERE id = ?',
      [req.userId]
    )
    
    res.json({
      success: true,
      todos: cloudTodos,
      syncedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('同步失败:', error)
    res.status(500).json({ error: '同步失败' })
  }
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
})

module.exports = app
