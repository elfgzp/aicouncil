package models

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

// MessageType 消息类型
type MessageType string

const (
	MessageTypeUser      MessageType = "user"
	MessageTypeAssistant MessageType = "assistant"
	MessageTypeSystem    MessageType = "system"
)

// Message 讨论消息
type Message struct {
	ID        string      `json:"id"`
	From      string      `json:"from"`       // user, claude-1, gpt-4o, kimi
	Type      MessageType `json:"type"`       // user, assistant, system
	Content   string      `json:"content"`
	Timestamp time.Time   `json:"timestamp"`
	ReplyTo   string      `json:"reply_to,omitempty"` // @提及支持
}

// NewMessage 创建新消息
func NewMessage(from string, msgType MessageType, content string) Message {
	return Message{
		ID:        uuid.New().String(),
		From:      from,
		Type:      msgType,
		Content:   content,
		Timestamp: time.Now(),
	}
}

// NewUserMessage 创建用户消息
func NewUserMessage(content string) Message {
	return NewMessage("user", MessageTypeUser, content)
}

// NewAssistantMessage 创建助手消息
func NewAssistantMessage(from, content string) Message {
	return NewMessage(from, MessageTypeAssistant, content)
}

// ToJSON 转换为 JSON 字符串
func (m Message) ToJSON() (string, error) {
	data, err := json.Marshal(m)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// MessageFromJSON 从 JSON 字符串解析消息
func MessageFromJSON(data string) (Message, error) {
	var m Message
	err := json.Unmarshal([]byte(data), &m)
	return m, err
}

// IsMentioned 检查是否提及指定参与者
func (m Message) IsMentioned(participantID string) bool {
	return strings.Contains(m.Content, "@"+participantID)
}
