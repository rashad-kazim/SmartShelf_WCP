package main

import (
	"context"
	"log"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/config"
	"smartshelf/wcp-backend/internal/server"
)

func main() {
	cfg := config.Load()
	state, err := appstate.New(context.Background(), cfg)
	if err != nil {
		log.Fatalf("state bootstrap failed: %v", err)
	}
	defer state.Close()

	engine := server.New(cfg, state)

	log.Printf("smartShelf backend starting on :%s (%s)", cfg.HTTPPort, cfg.AppEnv)
	if err := engine.Run(":" + cfg.HTTPPort); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
