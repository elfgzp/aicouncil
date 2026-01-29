package participant

import (
	"context"
	"fmt"
	"sync"

	"github.com/elfgzp/aicouncil/internal/models"
	"github.com/elfgzp/aicouncil/internal/provider"
)

// Manager 参与者管理器
type Manager struct {
	participants []*Participant
	council      CouncilInterface
	sessionDir   string
	mu           sync.RWMutex
}

// NewManager 创建新的管理器
func NewManager(sessionDir string, council CouncilInterface) *Manager {
	return &Manager{
		participants: make([]*Participant, 0),
		council:      council,
		sessionDir:   sessionDir,
	}
}

// AddParticipant 添加参与者
func (m *Manager) AddParticipant(cfg provider.Config) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 检查是否已存在
	for _, p := range m.participants {
		if p.ID == cfg.ID {
			return fmt.Errorf("参与者 %s 已存在", cfg.ID)
		}
	}

	p, err := New(cfg, m.sessionDir, m.council)
	if err != nil {
		return err
	}

	m.participants = append(m.participants, p)
	return nil
}

// RemoveParticipant 移除参与者
func (m *Manager) RemoveParticipant(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, p := range m.participants {
		if p.ID == id {
			p.Stop()
			m.participants = append(m.participants[:i], m.participants[i+1:]...)
			return
		}
	}
}

// StartAll 启动所有参与者
func (m *Manager) StartAll(ctx context.Context) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, p := range m.participants {
		p.StartAsync(ctx)
	}
}

// StopAll 停止所有参与者
func (m *Manager) StopAll() {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, p := range m.participants {
		p.Stop()
	}
}

// GetParticipants 获取所有参与者
func (m *Manager) GetParticipants() []*Participant {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*Participant, len(m.participants))
	copy(result, m.participants)
	return result
}

// GetRunningCount 获取运行中的参与者数量
func (m *Manager) GetRunningCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	count := 0
	for _, p := range m.participants {
		if p.IsRunning() {
			count++
		}
	}
	return count
}

// CouncilImpl 实现 CouncilInterface
type CouncilImpl struct {
	broadcastFunc func(msg models.Message)
}

// NewCouncilImpl 创建协调器实现
func NewCouncilImpl(fn func(msg models.Message)) *CouncilImpl {
	return &CouncilImpl{broadcastFunc: fn}
}

// Broadcast 广播消息
func (c *CouncilImpl) Broadcast(msg models.Message) {
	if c.broadcastFunc != nil {
		c.broadcastFunc(msg)
	}
}
