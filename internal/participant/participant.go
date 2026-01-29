package participant

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/elfgzp/aicouncil/internal/models"
	"github.com/elfgzp/aicouncil/internal/provider"
	"github.com/elfgzp/aicouncil/internal/watcher"
	"github.com/elfgzp/aicouncil/pkg/utils"
)

// Participant 讨论参与者
type Participant struct {
	ID          string
	Name        string
	Config      provider.Config
	Client      provider.Client
	SessionDir  string
	Council     CouncilInterface
	watcher     *watcher.FileWatcher
	writer      *utils.JSONLWriter
	lastReadPos int64
	isRunning   bool
}

// CouncilInterface 协调器接口
type CouncilInterface interface {
	Broadcast(msg models.Message)
}

// New 创建新的参与者
func New(cfg provider.Config, sessionDir string, council CouncilInterface) (*Participant, error) {
	client, err := provider.New(cfg)
	if err != nil {
		return nil, fmt.Errorf("创建 provider 客户端失败: %w", err)
	}

	// 创建参与者输出文件
	outputFile := filepath.Join(sessionDir, fmt.Sprintf("%s.json", cfg.ID))
	writer, err := utils.NewJSONLWriter(outputFile)
	if err != nil {
		return nil, fmt.Errorf("创建输出文件失败: %w", err)
	}

	return &Participant{
		ID:         cfg.ID,
		Name:       cfg.Name,
		Config:     cfg,
		Client:     client,
		SessionDir: sessionDir,
		Council:    council,
		writer:     writer,
	}, nil
}

// Start 启动参与者（阻塞）
func (p *Participant) Start(ctx context.Context) error {
	p.isRunning = true
	defer func() { p.isRunning = false }()

	discussionFile := filepath.Join(p.SessionDir, "discussion.jsonl")

	// 创建文件监控器
	p.watcher = watcher.New(discussionFile, func(line string) {
		p.handleNewLine(line)
	})

	// 启动监控（阻塞）
	return p.watcher.Start(ctx)
}

// StartAsync 异步启动
func (p *Participant) StartAsync(ctx context.Context) {
	go func() {
		if err := p.Start(ctx); err != nil && err != context.Canceled {
			fmt.Fprintf(os.Stderr, "[%s] 错误: %v\n", p.ID, err)
		}
	}()
}

// Stop 停止参与者
func (p *Participant) Stop() {
	p.isRunning = false
	if p.watcher != nil {
		p.watcher.Stop()
	}
	if p.writer != nil {
		p.writer.Close()
	}
}

// handleNewLine 处理新行
func (p *Participant) handleNewLine(line string) {
	// 解析消息
	msg, err := models.MessageFromJSON(line)
	if err != nil {
		return // 跳过无效行
	}

	// 检查是否需要处理
	if !p.shouldProcess(msg) {
		return
	}

	// 异步处理消息
	go p.processMessage(msg)
}

// shouldProcess 检查是否应该处理该消息
func (p *Participant) shouldProcess(msg models.Message) bool {
	// 跳过自己的消息
	if msg.From == p.ID {
		return false
	}

	// 处理用户消息
	if msg.Type == models.MessageTypeUser {
		return true
	}

	// 处理 @提及自己的消息
	if msg.IsMentioned(p.ID) {
		return true
	}

	// 处理回复自己的消息
	if msg.ReplyTo != "" {
		// TODO: 检查是否是回复自己的消息
		return true
	}

	return false
}

// processMessage 处理消息
func (p *Participant) processMessage(trigger models.Message) {
	// 读取所有相关消息构建上下文
	messages := p.buildContext()

	if len(messages) == 0 {
		return
	}

	// 调用 AI
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	response, err := p.Client.Complete(ctx, messages)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[%s] API 调用失败: %v\n", p.ID, err)
		return
	}

	// 创建响应消息
	reply := models.NewAssistantMessage(p.ID, response)
	reply.ReplyTo = trigger.ID

	// 写入自己的输出文件
	if err := p.writer.Write(reply); err != nil {
		fmt.Fprintf(os.Stderr, "[%s] 写入输出文件失败: %v\n", p.ID, err)
	}

	// 广播到讨论组
	p.Council.Broadcast(reply)
}

// buildContext 构建对话上下文
func (p *Participant) buildContext() []models.Message {
	// 读取 discussion.jsonl
	discussionFile := filepath.Join(p.SessionDir, "discussion.jsonl")
	reader := utils.NewJSONLReader(discussionFile)

	lines, err := reader.ReadAll()
	if err != nil {
		return nil
	}

	var messages []models.Message
	for _, line := range lines {
		msg, err := models.MessageFromJSON(line)
		if err != nil {
			continue
		}
		messages = append(messages, msg)
	}

	return messages
}

// IsRunning 检查是否运行中
func (p *Participant) IsRunning() bool {
	return p.isRunning
}

// Contains 检查字符串是否包含子串
func Contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
