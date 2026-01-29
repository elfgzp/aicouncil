package main

import (
	"fmt"
	"path/filepath"
	"time"

	"github.com/elfgzp/aicouncil/internal/config"
	"github.com/elfgzp/aicouncil/internal/council"
	"github.com/elfgzp/aicouncil/internal/provider"
	"github.com/spf13/cobra"
)

var (
	modelsFlag   string
	allFlag      bool
	roundsFlag   int
	continueFlag bool
)

var discussCmd = &cobra.Command{
	Use:   "discuss",
	Short: "启动多模型讨论组",
	Long: `启动一个多模型 AI 讨论组，让多个 AI 模型协作处理你的问题。

示例:
  aicouncil discuss                    # 交互式选择模型
  aicouncil discuss --models claude,gpt-4o  # 指定模型
  aicouncil discuss --all              # 使用所有已启用模型
  aicouncil discuss --rounds 1         # 单轮讨论模式
  aicouncil discuss --continue         # 继续上次讨论`,
	RunE: runDiscuss,
}

func init() {
	discussCmd.Flags().StringVarP(&modelsFlag, "models", "m", "", "模型列表，逗号分隔 (如: claude,gpt-4o)")
	discussCmd.Flags().BoolVarP(&allFlag, "all", "a", false, "使用所有已启用模型")
	discussCmd.Flags().IntVarP(&roundsFlag, "rounds", "r", 0, "讨论轮次限制 (0=无限)")
	discussCmd.Flags().BoolVarP(&continueFlag, "continue", "c", false, "继续上次讨论")
}

func runDiscuss(cmd *cobra.Command, args []string) error {
	fmt.Println("🚀 AICouncil 讨论组启动中...")
	fmt.Println()

	// 1. 加载配置
	cfg, err := config.Load("")
	if err != nil {
		return fmt.Errorf("加载配置失败: %w", err)
	}

	// 2. 选择模型
	var selectedModels []provider.Config
	if modelsFlag != "" {
		// 从命令行参数
		selectedModels, err = selectFromFlag(cfg, modelsFlag)
	} else if allFlag {
		// 使用所有已启用模型
		selectedModels = getEnabledProviders(cfg)
	} else {
		// 交互式选择
		selectedModels, err = selectInteractive(cfg)
	}

	if err != nil {
		return err
	}

	if len(selectedModels) == 0 {
		return fmt.Errorf("未选择任何模型")
	}

	// 3. 创建 Session 目录
	sessionDir := filepath.Join(cfg.System.SessionDir, fmt.Sprintf("session-%d", time.Now().Unix()))
	if continueFlag {
		sessionDir = filepath.Join(cfg.System.SessionDir, "live")
	}

	// 4. 创建协调器
	c, err := council.New(sessionDir)
	if err != nil {
		return fmt.Errorf("创建协调器失败: %w", err)
	}

	// 5. 初始化主持人（第一个模型）
	if err := c.InitHost(selectedModels[0].Model); err != nil {
		return fmt.Errorf("初始化主持人失败: %w", err)
	}

	// 6. 添加参与者（其他模型）
	if len(selectedModels) > 1 {
		if err := c.AddParticipants(selectedModels[1:]); err != nil {
			return fmt.Errorf("添加参与者失败: %w", err)
		}
	}

	// 7. 启动
	fmt.Printf("📁 Session 目录: %s\n", sessionDir)
	fmt.Printf("🎤 主持人: %s\n", selectedModels[0].Name)
	if len(selectedModels) > 1 {
		fmt.Printf("👥 参与者 (%d):\n", len(selectedModels)-1)
		for _, m := range selectedModels[1:] {
			fmt.Printf("   - %s\n", m.Name)
		}
	}
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()

	return c.Start()
}

func selectFromFlag(cfg *config.Config, flag string) ([]provider.Config, error) {
	// TODO: 解析命令行模型列表
	return nil, fmt.Errorf("--models 功能开发中")
}

func selectInteractive(cfg *config.Config) ([]provider.Config, error) {
	// 合并配置和预设
	var allModels []config.ModelConfig
	allModels = append(allModels, cfg.Models...)

	// 添加未配置的预设
	for _, p := range config.ListPresets() {
		found := false
		for _, m := range cfg.Models {
			if m.ID == p.ID {
				found = true
				break
			}
		}
		if !found {
			allModels = append(allModels, p)
		}
	}

	// 交互式选择
	fmt.Println("请选择参与讨论的模型（输入编号，多个用逗号分隔）：")
	for i, m := range allModels {
		fmt.Printf("  [%d] %s (%s)\n", i+1, m.Name, m.Provider)
	}

	// 简单实现：选择第一个和第二个
	var result []provider.Config
	if len(allModels) >= 1 {
		result = append(result, convertToProviderConfig(allModels[0]))
	}
	if len(allModels) >= 2 {
		result = append(result, convertToProviderConfig(allModels[1]))
	}
	return result, nil
}

func getEnabledProviders(cfg *config.Config) []provider.Config {
	var result []provider.Config
	for _, m := range cfg.Models {
		if m.Enabled {
			result = append(result, convertToProviderConfig(m))
		}
	}
	return result
}

func convertToProviderConfig(m config.ModelConfig) provider.Config {
	return provider.Config{
		ID:       m.ID,
		Name:     m.Name,
		Provider: provider.Provider(m.Provider),
		APIKey:   m.APIKey,
		BaseURL:  m.BaseURL,
		Model:    m.Model,
	}
}
