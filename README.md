# Lzuea Todo 📝

轻量级 Windows 桌面待办应用 —— 启动快、资源占用低、Always-on-Top 置顶显示。

## ✨ 特性

- ⚡ **极速启动** - 轻量级设计，秒开即用
- 📌 **Always-on-Top** - 整个窗口置顶在所有应用之上
- 💾 **本地存储** - 无需网络，数据保存在本地
- 🎨 **极简界面** - 无边框窗口，清爽不打扰
- ✏️ **完整 CRUD** - 支持任务的新增、编辑、删除、完成
- 🗂️ **智能过滤** - 快速切换全部/待办/已完成
- 🔧 **工程化架构** - Electron + Vue3 + TypeScript + Ant Design Vue

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | ^34.2.0 | 桌面应用框架 |
| Vue 3 | ^3.5.13 | 前端框架 |
| TypeScript | ~5.7.3 | 类型安全 |
| Ant Design Vue | ^4.2.6 | UI 组件库 |
| Pinia | ^2.3.1 | 状态管理 |
| electron-vite | ^3.0.0 | 构建工具 |

## 📦 安装

```bash
# 克隆仓库
git clone https://github.com/lezua-open/lzuea-todo.git
cd lzuea-todo

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包 Windows 应用
npm run dist:win
```

## 🚀 使用指南

### 开发
```bash
npm run dev
```

### 构建
```bash
# 构建所有平台
npm run dist

# 仅构建 Windows
npm run dist:win
```

### 运行打包后的应用
打包完成后，在 `release` 目录中找到安装程序：
- `LzueaTodo Setup x.x.x.exe` - 安装版
- `LzueaTodo-x.x.x-portable.exe` - 便携版

## 🎯 功能说明

### 置顶功能
- 点击标题栏的 📌 图标切换置顶状态
- 置顶时窗口会始终显示在其他应用之上
- 置顶状态会自动保存

### 任务管理
- **添加任务**：在输入框输入内容，按回车或点击"添加"
- **完成任务**：点击任务左侧的复选框
- **编辑任务**：双击任务文字或点击编辑图标
- **删除任务**：点击删除图标
- **清空已完成**：一键清除所有已完成的任务

### 窗口控制
- **最小化**：点击 `-` 按钮，应用最小化到任务栏
- **隐藏**：点击 `×` 按钮，应用隐藏到系统托盘
- **托盘操作**：右键托盘图标可显示/隐藏应用或退出

## 📁 项目结构

```
lzuea-todo/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 主入口
│   │   └── store.ts    # 本地存储封装
│   ├── preload/        # 预加载脚本
│   │   └── index.ts    # IPC 暴露
│   └── renderer/       # 渲染进程 (Vue3)
│       ├── main.ts     # Vue 入口
│       ├── App.vue     # 根组件
│       ├── components/ # 组件
│       ├── stores/     # Pinia Store
│       └── types/      # TypeScript 类型
├── build/              # 构建资源
├── .github/workflows/  # CI/CD
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
└── README.md
```

## 🔮 后续规划

- [ ] 数据导入/导出
- [ ] 多语言支持
- [ ] 主题切换（深色模式）
- [ ] 任务分类/标签
- [ ] 快捷键支持
- [ ] 任务提醒

## 📄 许可证

MIT License © 2025 Auze
