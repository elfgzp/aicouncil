package host

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/elfgzp/aicouncil/internal/models"
	"github.com/elfgzp/aicouncil/internal/watcher"
	"github.com/elfgzp/aicouncil/pkg/utils"
)

// Host 主持人（前台 Claude）
type Host struct {
	Model      string
	SessionDir string
	Cmd        *exec.Cmd
	writer     *utils.JSONLWriter
	watcher    *watcher.FileWatcher
	onMessage  func(msg models.Message)
}

// New 创建新的主持人
func New(model, sessionDir string) (*Host, error) {
	// 创建主持人输出文件
	outputFile := filepath.Join(sessionDir, "host.json")
	writer, err := utils.NewJSONLWriter(outputFile)
	if err != nil {
		return nil, fmt.Errorf("创建输出文件失败: %w", err)
	}

	return &Host{
		Model:      model,
		SessionDir: sessionDir,
		writer:     writer,
	}, nil
}

// SetMessageHandler 设置消息处理器
func (h *Host) SetMessageHandler(fn func(msg models.Message)) {
	h.onMessage = fn
}

// Start 启动主持人（阻塞）
func (h *Host) Start(ctx context.Context) error {
	// 启动讨论文件监控（用于显示其他 AI 的响应）
	if err := h.startWatcher(ctx); err != nil {
		return err
	}

	// 启动 Claude CLI
	return h.runClaude(ctx)
}

// startWatcher 启动文件监控
func (h *Host) startWatcher(ctx context.Context) error {
	discussionFile := filepath.Join(h.SessionDir, "discussion.jsonl")

	h.watcher = watcher.New(discussionFile, func(line string) {
		msg, err := models.MessageFromJSON(line)
		if err != nil {
			return
		}

		// 跳过用户消息（Claude 自己会显示）
		if msg.Type == models.MessageTypeUser {
			return
		}

		// 跳过主持人自己的消息
		if msg.From == "host" || msg.From == h.Model {
			return
		}

		// 显示其他 AI 的响应
		if h.onMessage != nil {
			h.onMessage(msg)
		}
	})

	go h.watcher.StartAsync(ctx)
	return nil
}

// runClaude 运行 Claude CLI
func (h *Host) runClaude(ctx context.Context) error {
	// 构建参数
	args := []string{
		"--session-dir", h.SessionDir,
	}

	// 检查是否有 hook 设置文件
	hookSettings := filepath.Join(h.SessionDir, "claude_hooks.json")
	if _, err := os.Stat(hookSettings); err == nil {
		args = append(args, "--settings", hookSettings)
	}

	// 创建命令
	h.Cmd = exec.CommandContext(ctx, "claude", args...)
	h.Cmd.Stdin = os.Stdin
	h.Cmd.Stdout = os.Stdout
	h.Cmd.Stderr = os.Stderr
	h.Cmd.Dir = h.SessionDir

	// 启动 Claude
	fmt.Println("🎤 启动主持人 Claude...")
	if err := h.Cmd.Run(); err != nil {
		if ctx.Err() == context.Canceled {
			return nil
		}
		return fmt.Errorf("Claude 进程退出: %w", err)
	}

	return nil
}

// Stop 停止主持人
func (h *Host) Stop() {
	if h.watcher != nil {
		h.watcher.Stop()
	}
	if h.writer != nil {
		h.writer.Close()
	}
	if h.Cmd != nil && h.Cmd.Process != nil {
		h.Cmd.Process.Kill()
	}
}

// IsRunning 检查是否运行中
func (h *Host) IsRunning() bool {
	if h.Cmd == nil || h.Cmd.Process == nil {
		return false
	}
	// 检查进程是否存在
	err := h.Cmd.Process.Signal(os.Signal(nil))
	return err == nil
}
