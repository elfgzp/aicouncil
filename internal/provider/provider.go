package provider

import (
	"context"
	"fmt"

	"github.com/elfgzp/aicouncil/internal/models"
)

// Provider 模型提供商类型
type Provider string

const (
	ProviderAnthropic Provider = "anthropic"
	ProviderOpenAI    Provider = "openai"
	ProviderGoogle    Provider = "google"
)

// Client Provider 客户端接口
type Client interface {
	// Complete 完成对话
	Complete(ctx context.Context, messages []models.Message) (string, error)

	// Stream 流式对话（可选实现）
	Stream(ctx context.Context, messages []models.Message) (<-chan string, error)
}

// Config Provider 配置
type Config struct {
	ID       string
	Name     string
	Provider Provider
	APIKey   string
	BaseURL  string
	Model    string
}

// New 创建 Provider 客户端
func New(cfg Config) (Client, error) {
	switch cfg.Provider {
	case ProviderAnthropic:
		return NewAnthropicClient(cfg), nil
	case ProviderOpenAI:
		return NewOpenAIClient(cfg), nil
	case ProviderGoogle:
		return nil, fmt.Errorf("Google provider not implemented yet")
	default:
		return nil, fmt.Errorf("unknown provider: %s", cfg.Provider)
	}
}

// ConvertMessages 将 models.Message 转换为 Provider 特定的消息格式
func ConvertMessages(messages []models.Message) []Message {
	var result []Message
	for _, m := range messages {
		role := "user"
		switch m.Type {
		case models.MessageTypeAssistant:
			role = "assistant"
		case models.MessageTypeSystem:
			role = "system"
		}

		result = append(result, Message{
			Role:    role,
			Content: m.Content,
		})
	}
	return result
}

// Message 通用消息格式
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
