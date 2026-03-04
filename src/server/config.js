// 数据库配置 - 生产环境应该用环境变量
const dbConfig = {
  host: '43.156.136.115',
  port: 30929,
  user: 'root',
  password: 'v152EW04Y6eMxBsdZ7zo9PH3GC8qUpmu',
  database: 'zeabur',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

module.exports = dbConfig
