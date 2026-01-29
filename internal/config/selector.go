package config

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/huh"
)

// SelectModels 交互式选择模型
func SelectModels(cfg *Config, allFlag bool) ([]ModelConfig, error) {
	if allFlag {
		return cfg.GetEnabledModels(), nil
	}

	// 合并用户配置和预设
	options := buildModelOptions(cfg)

	var selected []string
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewMultiSelect[string]().
				Title("选择参与讨论的模型").
				Description("空格选择，回车确认").
				Options(options...).
				Value(&selected),
		),
	)

	if err := form.Run(); err != nil {
		return nil, err
	}

	// 根据选择获取完整配置
	var models []ModelConfig
	for _, id := range selected {
		if model := cfg.GetModelByID(id); model != nil {
			models = append(models, *model)
		}
	}

	return models, nil
}

// SelectModelsFromFlag 从命令行参数解析模型
func SelectModelsFromFlag(cfg *Config, modelsFlag string) ([]ModelConfig, error) {
	if modelsFlag == "" {
		return nil, fmt.Errorf("未指定模型")
	}

	ids := strings.Split(modelsFlag, ",")
	var models []ModelConfig

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if model := cfg.GetModelByID(id); model != nil {
			models = append(models, *model)
		} else if preset := GetPresetByID(id); preset != nil {
			// 使用预设，但需要检查是否有 API Key
			models = append(models, *preset)
		} else {
			return nil, fmt.Errorf("未知模型: %s", id)
		}
	}

	return models, nil
}

// buildModelOptions 构建模型选项列表
func buildModelOptions(cfg *Config) []huh.Option[string] {
	var options []huh.Option[string]

	// 先添加用户已配置的模型
	for _, m := range cfg.Models {
		if m.Enabled {
			label := fmt.Sprintf("%s (%s) [已配置]", m.Name, m.Provider)
			options = append(options, huh.NewOption(label, m.ID))
		}
	}

	// 添加预设模型
	for _, p := range PresetModels {
		// 跳过已配置的
		if cfg.GetModelByID(p.ID) != nil {
			continue
		}
		label := fmt.Sprintf("%s (%s)", p.Name, p.Provider)
		options = append(options, huh.NewOption(label, p.ID))
	}

	return options
}

// Confirm 确认对话框
func Confirm(title, description string) (bool, error) {
	var confirmed bool
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewConfirm().
				Title(title).
				Description(description).
				Value(&confirmed),
		),
	)

	if err := form.Run(); err != nil {
		return false, err
	}

	return confirmed, nil
}

// Input 输入对话框
func Input(title, description, placeholder string) (string, error) {
	var value string
	form := huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Title(title).
				Description(description).
				Placeholder(placeholder).
				Value(&value),
		),
	)

	if err := form.Run(); err != nil {
		return "", err
	}

	return value, nil
}
