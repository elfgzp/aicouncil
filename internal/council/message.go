package council

import (
	"github.com/elfgzp/aicouncil/internal/models"
)

// Re-export from models package for backward compatibility
type Message = models.Message
type MessageType = models.MessageType

const (
	MessageTypeUser      = models.MessageTypeUser
	MessageTypeAssistant = models.MessageTypeAssistant
	MessageTypeSystem    = models.MessageTypeSystem
)

// NewMessage 创建新消息
func NewMessage(from string, msgType MessageType, content string) Message {
	return models.NewMessage(from, msgType, content)
}

// NewUserMessage 创建用户消息
func NewUserMessage(content string) Message {
	return models.NewUserMessage(content)
}

// NewAssistantMessage 创建助手消息
func NewAssistantMessage(from, content string) Message {
	return models.NewAssistantMessage(from, content)
}

// MessageFromJSON 从 JSON 字符串解析消息
func MessageFromJSON(data string) (Message, error) {
	return models.MessageFromJSON(data)
}
