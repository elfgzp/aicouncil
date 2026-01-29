package watcher

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"time"
)

// FileWatcher 文件监控器（类似 Happy CLI 的 sessionScanner）
type FileWatcher struct {
	filePath string
	position int64
	callback func(line string)
	interval time.Duration
	stopCh   chan struct{}
}

// New 创建新的文件监控器
func New(filePath string, callback func(line string)) *FileWatcher {
	return &FileWatcher{
		filePath: filePath,
		callback: callback,
		interval: 200 * time.Millisecond,
		stopCh:   make(chan struct{}),
	}
}

// WithInterval 设置轮询间隔
func (w *FileWatcher) WithInterval(interval time.Duration) *FileWatcher {
	w.interval = interval
	return w
}

// Start 启动监控（阻塞）
func (w *FileWatcher) Start(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	// 首次检查文件是否存在
	if _, err := os.Stat(w.filePath); os.IsNotExist(err) {
		// 等待文件创建
		for {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-w.stopCh:
				return nil
			case <-ticker.C:
				if _, err := os.Stat(w.filePath); err == nil {
					goto startWatching
				}
			}
		}
	}

startWatching:
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-w.stopCh:
			return nil
		case <-ticker.C:
			if err := w.readNewLines(); err != nil {
				// 文件可能被删除或重命名，继续尝试
				continue
			}
		}
	}
}

// StartAsync 异步启动监控
func (w *FileWatcher) StartAsync(ctx context.Context) {
	go func() {
		if err := w.Start(ctx); err != nil && err != context.Canceled {
			fmt.Fprintf(os.Stderr, "FileWatcher error: %v\n", err)
		}
	}()
}

// Stop 停止监控
func (w *FileWatcher) Stop() {
	close(w.stopCh)
}

// readNewLines 读取新增行
func (w *FileWatcher) readNewLines() error {
	file, err := os.Open(w.filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	// 获取文件信息
	stat, err := file.Stat()
	if err != nil {
		return err
	}

	// 如果文件被截断（大小小于当前位置），重置位置
	if stat.Size() < w.position {
		w.position = 0
	}

	// 跳转到上次读取位置
	if _, err := file.Seek(w.position, 0); err != nil {
		return err
	}

	// 读取新行
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if line != "" {
			w.callback(line)
		}
		w.position += int64(len(line)) + 1 // +1 for newline
	}

	return scanner.Err()
}

// GetPosition 获取当前读取位置
func (w *FileWatcher) GetPosition() int64 {
	return w.position
}

// SetPosition 设置读取位置
func (w *FileWatcher) SetPosition(pos int64) {
	w.position = pos
}

// Reset 重置读取位置
func (w *FileWatcher) Reset() {
	w.position = 0
}
