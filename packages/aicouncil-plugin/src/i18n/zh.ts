/**
 * Simplified Chinese translations
 */

import type { TranslationKeys } from './types'

export const zh: TranslationKeys = {
  common: {
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    close: '关闭',
    retry: '重试',
  },

  setup: {
    title: '讨论组设置',
    selectModels: '选择参与讨论的模型',
    selectHost: '选择主持人模型',
    noModelsSelected: '未选择任何模型',
    minModelsRequired: '讨论至少需要 2 个模型参与',
    hostRequired: '必须选择一个主持人',
    ready: '讨论组已准备就绪',
  },

  discussion: {
    start: '开始讨论',
    starting: '正在启动讨论...',
    inProgress: '讨论进行中',
    paused: '讨论已暂停',
    completed: '讨论已完成',
    topic: '议题',
    round: '轮次',
    roundOf: '第 {current} 轮，共 {total} 轮',
    participants: '参与者',
    host: '主持人',
    noHost: '未选择主持人',
    waiting: '等待响应中...',
  },

  participant: {
    thinking: '思考中...',
    responding: '回复中...',
    idle: '空闲',
    error: '发生错误',
    joined: '{name} 加入了讨论',
    left: '{name} 离开了讨论',
  },

  messages: {
    userPrompt: '用户',
    systemMessage: '系统',
    summary: '总结',
    noMessages: '暂无消息',
    newRound: '=== 第 {round} 轮 ===',
    roundComplete: '第 {round} 轮已完成',
  },

  commands: {
    setup: {
      name: 'council_setup',
      description: '设置多模型讨论组',
    },
    discuss: {
      name: 'council_discuss',
      description: '使用已配置的讨论组开始讨论',
    },
    status: {
      name: 'council_status',
      description: '显示当前讨论组状态',
    },
    models: {
      name: 'council_models',
      description: '列出可用于讨论组的模型',
    },
    end: {
      name: 'council_end',
      description: '结束当前讨论',
    },
    next: {
      name: 'council_next',
      description: '进入下一轮讨论',
    },
  },

  errors: {
    noActiveDiscussion: '没有活动的讨论。请先使用 council_setup 设置讨论组。',
    discussionAlreadyRunning: '已有讨论正在进行中。',
    providerError: '提供商错误：{message}',
    timeout: '{participant} 响应超时',
    invalidConfig: '配置无效：{message}',
    modelNotFound: '未找到模型：{model}',
    apiError: 'API 错误：{message}',
    networkError: '网络错误：{message}',
  },

  prompts: {
    hostSystemPrompt: `你是一个多模型 AI 讨论组的主持人。
你的职责是：
1. 促进参与者之间的讨论
2. 总结每轮讨论的要点
3. 引导对话朝着有成效的方向发展
4. 决定讨论何时达成结论

当前参与者：{participants}
议题：{topic}`,

    participantSystemPrompt: `你正在参与一个多模型 AI 讨论组。
你的职责是：
1. 就议题提供深思熟虑的见解
2. 在其他参与者的观点基础上进行补充或提出不同意见
3. 保持对讨论议题的专注
4. 简洁但全面地表达观点

主持人：{host}
其他参与者：{participants}
议题：{topic}`,

    summaryPrompt: `请总结第 {round} 轮讨论的要点。
重点关注：
1. 提出的主要论点
2. 达成共识的观点
3. 存在分歧的观点
4. 提出的新见解或问题`,

    roundStartPrompt: `=== 第 {round} 轮 ===
议题：{topic}
前文背景：{context}

请分享你对这个议题的看法。`,
  },
}
