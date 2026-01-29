package config

// PresetModels 内置预设模型
var PresetModels = []ModelConfig{
	// Anthropic 系列
	{
		ID:       "claude-sonnet-4",
		Name:     "Claude Sonnet 4",
		Provider: "anthropic",
		Model:    "claude-sonnet-4-20250514",
		BaseURL:  "https://api.anthropic.com",
		Enabled:  false,
	},
	{
		ID:       "claude-haiku-4",
		Name:     "Claude Haiku 4",
		Provider: "anthropic",
		Model:    "claude-haiku-4-20250514",
		BaseURL:  "https://api.anthropic.com",
		Enabled:  false,
	},
	{
		ID:       "claude-opus-4",
		Name:     "Claude Opus 4",
		Provider: "anthropic",
		Model:    "claude-opus-4-20250514",
		BaseURL:  "https://api.anthropic.com",
		Enabled:  false,
	},

	// OpenAI 系列
	{
		ID:       "gpt-4o",
		Name:     "GPT-4o",
		Provider: "openai",
		Model:    "gpt-4o",
		BaseURL:  "https://api.openai.com/v1",
		Enabled:  false,
	},
	{
		ID:       "gpt-4o-mini",
		Name:     "GPT-4o Mini",
		Provider: "openai",
		Model:    "gpt-4o-mini",
		BaseURL:  "https://api.openai.com/v1",
		Enabled:  false,
	},
	{
		ID:       "o1",
		Name:     "o1",
		Provider: "openai",
		Model:    "o1",
		BaseURL:  "https://api.openai.com/v1",
		Enabled:  false,
	},
	{
		ID:       "o3-mini",
		Name:     "o3-mini",
		Provider: "openai",
		Model:    "o3-mini",
		BaseURL:  "https://api.openai.com/v1",
		Enabled:  false,
	},

	// Google 系列
	{
		ID:       "gemini-2.5-pro",
		Name:     "Gemini 2.5 Pro",
		Provider: "google",
		Model:    "gemini-2.5-pro",
		BaseURL:  "https://generativelanguage.googleapis.com/v1",
		Enabled:  false,
	},
	{
		ID:       "gemini-2.5-flash",
		Name:     "Gemini 2.5 Flash",
		Provider: "google",
		Model:    "gemini-2.5-flash",
		BaseURL:  "https://generativelanguage.googleapis.com/v1",
		Enabled:  false,
	},

	// 中文服务 (Anthropic 兼容)
	{
		ID:       "minimax-m2.1",
		Name:     "MiniMax M2.1",
		Provider: "anthropic",
		Model:    "MiniMax-M2.1",
		BaseURL:  "https://api.minimaxi.com/anthropic/v1",
		Enabled:  false,
	},
	{
		ID:       "kimi-k2",
		Name:     "Kimi K2",
		Provider: "anthropic",
		Model:    "kimi-k2",
		BaseURL:  "https://api.kimi.com/coding/v1",
		Enabled:  false,
	},
	{
		ID:       "moonshot-k2",
		Name:     "Moonshot K2",
		Provider: "anthropic",
		Model:    "moonshot-k2",
		BaseURL:  "https://api.moonshot.cn/v1",
		Enabled:  false,
	},
}

// GetPresetByID 根据 ID 获取预设模型
func GetPresetByID(id string) *ModelConfig {
	for _, p := range PresetModels {
		if p.ID == id {
			return &p
		}
	}
	return nil
}

// ListPresets 列出所有预设模型
func ListPresets() []ModelConfig {
	return PresetModels
}
