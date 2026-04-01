<template>
  <a-layout class="min-h-screen bg-slate-50">
    <a-layout-header class="header-container" :style="{ height: '64px', lineHeight: '64px' }">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <div class="logo-box">
            <BotIcon :size="20" class="text-white" />
          </div>
          <div class="flex flex-col justify-center leading-none">
            <span class="text-lg font-bold text-slate-900 tracking-tight">AI Chat Plus</span>
            <span class="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Enterprise RAG Platform</span>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <a-menu mode="horizontal" :selectedKeys="selectedKeys" class="header-menu">
            <a-menu-item key="/chat">
              <RouterLink to="/chat" class="flex items-center gap-2">
                <MessageSquareIcon :size="16" />
                <span>智能对话</span>
              </RouterLink>
            </a-menu-item>
          </a-menu>
          
          <a-divider type="vertical" />
          
          <div class="flex items-center gap-3">
            <a-button type="text" shape="circle">
              <template #icon><Code2Icon :size="18" /></template>
            </a-button>
            <a-avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" :size="32" class="cursor-pointer border border-slate-200" />
          </div>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content class="main-content">
      <div class="mx-auto max-w-6xl px-6 py-8">
        <RouterView />
      </div>
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MessageSquareIcon, BotIcon, Code2Icon } from 'lucide-vue-next'

const route = useRoute()
const selectedKeys = computed(() => [route.path])
</script>

<style scoped>
.header-container {
  background: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #f1f5f9;
  padding-inline: 0 !important;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

.logo-box {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(22, 119, 255, 0.2);
}

.header-menu {
  background: transparent !important;
  border-bottom: 0 !important;
  line-height: 64px !important;
}

:deep(.ant-menu-item) {
  padding: 0 12px !important;
}

:deep(.ant-menu-item-active), :deep(.ant-menu-item-selected) {
  background: transparent !important;
}

.main-content {
  background-image: radial-gradient(#e2e8f0 0.5px, transparent 0.5px);
  background-size: 24px 24px;
}
</style>
