package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	verbose bool
)

var rootCmd = &cobra.Command{
	Use:   "aicouncil",
	Short: "多模型 AI 协作讨论系统",
	Long: `AICouncil - 让多个 AI 模型参与同一个讨论组

示例:
  aicouncil discuss                    # 交互式选择模型开始讨论
  aicouncil discuss --models claude,gpt-4o  # 指定模型
  aicouncil models list                # 列出已配置模型`,
}

func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "配置文件路径 (默认: ~/.aicouncil/config.yaml)")
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "详细输出")

	rootCmd.AddCommand(discussCmd)
	rootCmd.AddCommand(modelsCmd)
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: 无法获取用户主目录: %v\n", err)
			os.Exit(1)
		}

		aicouncilDir := filepath.Join(home, ".aicouncil")
		viper.AddConfigPath(aicouncilDir)
		viper.SetConfigName("config")
		viper.SetConfigType("yaml")
	}

	viper.SetEnvPrefix("AICOUNCIL")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			fmt.Fprintf(os.Stderr, "Error: 读取配置文件失败: %v\n", err)
		}
	}
}
