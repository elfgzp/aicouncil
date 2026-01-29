package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var modelsCmd = &cobra.Command{
	Use:   "models",
	Short: "模型管理",
	Long:  "管理已配置的 AI 模型",
}

var modelsListCmd = &cobra.Command{
	Use:   "list",
	Short: "列出已配置模型",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("已配置模型列表:")
		fmt.Println()
		fmt.Println("功能开发中...")
		return nil
	},
}

var modelsAddCmd = &cobra.Command{
	Use:   "add",
	Short: "添加模型",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println("添加模型 (交互式):")
		fmt.Println()
		fmt.Println("功能开发中...")
		return nil
	},
}

var modelsRemoveCmd = &cobra.Command{
	Use:   "remove [model-id]",
	Short: "移除模型",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Printf("移除模型: %s\n", args[0])
		fmt.Println("功能开发中...")
		return nil
	},
}

func init() {
	modelsCmd.AddCommand(modelsListCmd)
	modelsCmd.AddCommand(modelsAddCmd)
	modelsCmd.AddCommand(modelsRemoveCmd)
}
