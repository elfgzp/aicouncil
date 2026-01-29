package utils

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// JSONLWriter JSONL 文件写入器
type JSONLWriter struct {
	file   *os.File
	writer *bufio.Writer
	mu     sync.Mutex
}

// NewJSONLWriter 创建新的 JSONL 写入器
func NewJSONLWriter(filepath string) (*JSONLWriter, error) {
	file, err := os.OpenFile(filepath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return nil, fmt.Errorf("打开文件失败: %w", err)
	}

	return &JSONLWriter{
		file:   file,
		writer: bufio.NewWriter(file),
	}, nil
}

// Write 写入一条记录
func (w *JSONLWriter) Write(v interface{}) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("序列化失败: %w", err)
	}

	if _, err := w.writer.Write(data); err != nil {
		return fmt.Errorf("写入失败: %w", err)
	}

	if err := w.writer.WriteByte('\n'); err != nil {
		return fmt.Errorf("写入换行失败: %w", err)
	}

	return w.writer.Flush()
}

// Close 关闭写入器
func (w *JSONLWriter) Close() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if err := w.writer.Flush(); err != nil {
		return err
	}
	return w.file.Close()
}

// JSONLReader JSONL 文件读取器
type JSONLReader struct {
	filePath string
	position int64
}

// NewJSONLReader 创建新的 JSONL 读取器
func NewJSONLReader(filepath string) *JSONLReader {
	return &JSONLReader{
		filePath: filepath,
		position: 0,
	}
}

// ReadNew 读取新增内容
func (r *JSONLReader) ReadNew() ([]string, error) {
	file, err := os.Open(r.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	defer file.Close()

	// 跳转到上次读取位置
	if _, err := file.Seek(r.position, 0); err != nil {
		return nil, err
	}

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if line != "" {
			lines = append(lines, line)
		}
		r.position += int64(len(line)) + 1 // +1 for newline
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return lines, nil
}

// ReadAll 读取所有内容
func (r *JSONLReader) ReadAll() ([]string, error) {
	r.position = 0
	return r.ReadNew()
}

// GetPosition 获取当前读取位置
func (r *JSONLReader) GetPosition() int64 {
	return r.position
}

// SetPosition 设置读取位置
func (r *JSONLReader) SetPosition(pos int64) {
	r.position = pos
}

// ParseLines 解析 JSONL 行到指定类型
func ParseLines[T any](lines []string) ([]T, error) {
	var results []T
	for _, line := range lines {
		var v T
		if err := json.Unmarshal([]byte(line), &v); err != nil {
			// 跳过损坏的行
			continue
		}
		results = append(results, v)
	}
	return results, nil
}
