package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/elfgzp/aicouncil/internal/models"
)

const (
	defaultAnthropicBaseURL = "https://api.anthropic.com"
	anthropicAPIVersion     = "2023-06-01"
)

// AnthropicClient Anthropic API 客户端
type AnthropicClient struct {
	config Config
	client *http.Client
}

// NewAnthropicClient 创建 Anthropic 客户端
func NewAnthropicClient(cfg Config) *AnthropicClient {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = defaultAnthropicBaseURL
	}

	return &AnthropicClient{
		config: Config{
			ID:       cfg.ID,
			Name:     cfg.Name,
			Provider: cfg.Provider,
			APIKey:   cfg.APIKey,
			BaseURL:  baseURL,
			Model:    cfg.Model,
		},
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// Complete 完成对话
func (c *AnthropicClient) Complete(ctx context.Context, messages []models.Message) (string, error) {
	// 转换消息格式
	anthropicMessages := c.convertMessages(messages)

	// 构建请求
	reqBody := anthropicRequest{
		Model:     c.config.Model,
		Messages:  anthropicMessages,
		MaxTokens: 4000,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request failed: %w", err)
	}

	// 创建请求
	url := fmt.Sprintf("%s/v1/messages", c.config.BaseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("create request failed: %w", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.config.APIKey)
	req.Header.Set("anthropic-version", anthropicAPIVersion)

	// 发送请求
	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("send request failed: %w", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response failed: %w", err)
	}

	// 检查状态码
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error: %s (status: %d)", string(body), resp.StatusCode)
	}

	// 解析响应
	var result anthropicResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse response failed: %w", err)
	}

	// 提取文本内容
	if len(result.Content) > 0 {
		return result.Content[0].Text, nil
	}

	return "", fmt.Errorf("empty response from API")
}

// Stream 流式对话
func (c *AnthropicClient) Stream(ctx context.Context, messages []models.Message) (<-chan string, error) {
	// TODO: 实现流式响应
	return nil, fmt.Errorf("stream not implemented yet")
}

// convertMessages 转换消息格式
func (c *AnthropicClient) convertMessages(messages []models.Message) []anthropicMessage {
	var result []anthropicMessage
	for _, m := range messages {
		role := "user"
		if m.Type == models.MessageTypeAssistant {
			role = "assistant"
		}

		result = append(result, anthropicMessage{
			Role:    role,
			Content: m.Content,
		})
	}
	return result
}

// anthropicMessage Anthropic 消息格式
type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// anthropicRequest Anthropic 请求格式
type anthropicRequest struct {
	Model     string              `json:"model"`
	Messages  []anthropicMessage  `json:"messages"`
	MaxTokens int                 `json:"max_tokens"`
}

// anthropicResponse Anthropic 响应格式
type anthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Role    string `json:"role"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Model string `json:"model"`
}
