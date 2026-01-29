package council

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/elfgzp/aicouncil/internal/host"
	"github.com/elfgzp/aicouncil/internal/participant"
	"github.com/elfgzp/aicouncil/internal/provider"
	"github.com/elfgzp/aicouncil/pkg/utils"
)

// Council 协调器
type Council struct {
	SessionDir   string
	Host         *host.Host
	Manager      *participant.Manager
	Writer       *utils.JSONLWriter
	MessageBus   chan Message
	ctx          context.Context
	cancel       context.CancelFunc
}

// New 创建新的协调器
func New(sessionDir string) (*Council, error) {
	// 创建 session 目录
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		return nil, fmt.Errorf("创建 session 目录失败: %w", err)
	}

	// 创建 discussion.jsonl
	discussionFile := filepath.Join(sessionDir, "discussion.jsonl")
	writer, err := utils.NewJSONLWriter(discussionFile)
	if err != nil {
		return nil, fmt.Errorf("创建 discussion 文件失败: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	c := &Council{
		SessionDir: sessionDir,
		Writer:     writer,
		MessageBus: make(chan Message, 100),
		ctx:        ctx,
		cancel:     cancel,
	}

	// 创建参与者管理器
	c.Manager = participant.NewManager(sessionDir, c)

	return c, nil
}

// InitHost 初始化主持人
func (c *Council) InitHost(model string) error {
	h, err := host.New(model, c.SessionDir)
	if err != nil {
		return err
	}

	// 设置消息处理器（显示其他 AI 的响应）
	h.SetMessageHandler(func(msg Message) {
		fmt.Printf("\n\n[%s] %s\n\n", msg.From, msg.Content)
	})

	c.Host = h
	return nil
}

// AddParticipants 添加参与者
func (c *Council) AddParticipants(configs []provider.Config) error {
	for _, cfg := range configs {
		if err := c.Manager.AddParticipant(cfg); err != nil {
			return fmt.Errorf("添加参与者 %s 失败: %w", cfg.ID, err)
		}
	}
	return nil
}

// Start 启动协调器
func (c *Council) Start() error {
	// 启动消息广播协程
	go c.broadcastLoop()

	// 启动所有参与者
	c.Manager.StartAll(c.ctx)

	// 设置信号处理
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	// 启动主持人（阻塞）
	go func() {
		if err := c.Host.Start(c.ctx); err != nil {
			fmt.Fprintf(os.Stderr, "主持人错误: %v\n", err)
		}
		// 主持人退出，停止整个协调器
		c.Stop()
	}()

	// 等待退出信号
	<-sigCh
	fmt.Println("\n🛑 收到退出信号，正在关闭...")
	c.Stop()

	return nil
}

// Stop 停止协调器
func (c *Council) Stop() {
	c.cancel()

	if c.Host != nil {
		c.Host.Stop()
	}

	if c.Manager != nil {
		c.Manager.StopAll()
	}

	if c.Writer != nil {
		c.Writer.Close()
	}

	close(c.MessageBus)
}

// Broadcast 广播消息到讨论组
func (c *Council) Broadcast(msg Message) {
	select {
	case c.MessageBus <- msg:
	case <-c.ctx.Done():
	}
}

// broadcastLoop 消息广播循环
func (c *Council) broadcastLoop() {
	for {
		select {
		case <-c.ctx.Done():
			return
		case msg, ok := <-c.MessageBus:
			if !ok {
				return
			}
			// 写入 discussion.jsonl
			if err := c.Writer.Write(msg); err != nil {
				fmt.Fprintf(os.Stderr, "写入消息失败: %v\n", err)
			}
		}
	}
}

// GetStatus 获取状态
func (c *Council) GetStatus() map[string]interface{} {
	return map[string]interface{}{
		"session_dir":      c.SessionDir,
		"host_running":     c.Host != nil && c.Host.IsRunning(),
		"participants":     len(c.Manager.GetParticipants()),
		"running_count":    c.Manager.GetRunningCount(),
	}
}
