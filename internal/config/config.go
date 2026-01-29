package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

// Config 主配置结构
type Config struct {
	System   SystemConfig   `yaml:"system"`
	Defaults DefaultsConfig `yaml:"defaults"`
	Models   []ModelConfig  `yaml:"models"`
}

// SystemConfig 系统配置
type SystemConfig struct {
	LogLevel     string `yaml:"log_level"`
	SessionDir   string `yaml:"session_dir"`
	PollInterval string `yaml:"poll_interval"`
}

// DefaultsConfig 默认配置
type DefaultsConfig struct {
	MaxRounds int    `yaml:"max_rounds"`
	Timeout   string `yaml:"timeout"`
}

// ModelConfig 模型配置
type ModelConfig struct {
	ID       string `yaml:"id"`
	Name     string `yaml:"name"`
	Provider string `yaml:"provider"`
	APIKey   string `yaml:"api_key"`
	BaseURL  string `yaml:"base_url,omitempty"`
	Enabled  bool   `yaml:"enabled"`
	Model    string `yaml:"model,omitempty"` // 实际模型名称
}

// Load 加载配置
func Load(cfgFile string) (*Config, error) {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("无法获取用户主目录: %w", err)
		}

		aicouncilDir := filepath.Join(home, ".aicouncil")
		viper.AddConfigPath(aicouncilDir)
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
	}

	viper.SetEnvPrefix("AICOUNCIL")
	viper.AutomaticEnv()

	// 设置默认值
	setDefaults()

	// 读取配置
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("读取配置文件失败: %w", err)
		}
		// 配置文件不存在，使用默认值
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	// 处理环境变量替换
	for i := range cfg.Models {
		cfg.Models[i].APIKey = expandEnvVars(cfg.Models[i].APIKey)
	}

	// 展开路径
	cfg.System.SessionDir = expandPath(cfg.System.SessionDir)

	return &cfg, nil
}

// setDefaults 设置默认值
func setDefaults() {
	home, _ := os.UserHomeDir()
	viper.SetDefault("system.log_level", "info")
	viper.SetDefault("system.session_dir", filepath.Join(home, ".aicouncil", "sessions"))
	viper.SetDefault("system.poll_interval", "500ms")
	viper.SetDefault("defaults.max_rounds", 3)
	viper.SetDefault("defaults.timeout", "60s")
}

// expandEnvVars 展开环境变量 ${VAR} 或 $VAR
func expandEnvVars(s string) string {
	return os.Expand(s, func(key string) string {
		return os.Getenv(key)
	})
}

// expandPath 展开路径中的 ~
func expandPath(path string) string {
	if strings.HasPrefix(path, "~/") {
		home, _ := os.UserHomeDir()
		return filepath.Join(home, path[2:])
	}
	return path
}

// GetEnabledModels 获取已启用的模型
func (c *Config) GetEnabledModels() []ModelConfig {
	var enabled []ModelConfig
	for _, m := range c.Models {
		if m.Enabled {
			enabled = append(enabled, m)
		}
	}
	return enabled
}

// GetModelByID 根据 ID 获取模型配置
func (c *Config) GetModelByID(id string) *ModelConfig {
	for i := range c.Models {
		if c.Models[i].ID == id {
			return &c.Models[i]
		}
	}
	return nil
}

// Save 保存配置
func (c *Config) Save() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	aicouncilDir := filepath.Join(home, ".aicouncil")
	if err := os.MkdirAll(aicouncilDir, 0755); err != nil {
		return err
	}

	viper.Set("system", c.System)
	viper.Set("defaults", c.Defaults)
	viper.Set("models", c.Models)

	configPath := filepath.Join(aicouncilDir, "config.yaml")
	return viper.WriteConfigAs(configPath)
}
