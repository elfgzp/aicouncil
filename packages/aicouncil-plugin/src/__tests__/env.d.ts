/// <reference types="vitest" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      KIMI_API_KEY?: string
      MINIMAX_API_KEY?: string
    }
  }
}

export {}
