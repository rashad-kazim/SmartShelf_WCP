package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/config"
	"smartshelf/wcp-backend/internal/httpx/middleware"
	"smartshelf/wcp-backend/internal/httpx/response"
	authmodule "smartshelf/wcp-backend/internal/modules/auth"
	dashboardmodule "smartshelf/wcp-backend/internal/modules/dashboard"
	notificationsmodule "smartshelf/wcp-backend/internal/modules/notifications"
	placeholdermodule "smartshelf/wcp-backend/internal/modules/placeholder"
	preferencesmodule "smartshelf/wcp-backend/internal/modules/preferences"
	referencemodule "smartshelf/wcp-backend/internal/modules/reference"
	storesmodule "smartshelf/wcp-backend/internal/modules/stores"
	usersmodule "smartshelf/wcp-backend/internal/modules/users"
)

func New(cfg config.Config, state *appstate.State) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery(), middleware.SecurityHeadersMiddleware(), middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	engine.GET("/healthz", func(c *gin.Context) {
		response.Success(c, http.StatusOK, gin.H{
			"status": "ok",
			"env":    cfg.AppEnv,
		})
	})

	api := engine.Group("/api/v1")
	api.GET("/health", func(c *gin.Context) {
		checks := state.Health(c.Request.Context())
		status := "ok"
		for _, check := range checks {
			if check.Status != "ok" {
				status = "degraded"
				break
			}
		}
		response.Success(c, http.StatusOK, gin.H{
			"status": status,
			"env":    cfg.AppEnv,
			"checks": checks,
		})
	})

	authmodule.Register(api.Group("/auth"), state)

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(state))

	preferencesmodule.Register(protected.Group("/preferences"), state)
	dashboardmodule.Register(protected.Group("/dashboard"), state)
	notificationsmodule.Register(protected.Group("/notifications"), state)
	referencemodule.Register(protected.Group("/reference"), state)
	storesmodule.Register(protected.Group("/stores"), state)
	usersmodule.Register(protected, state)
	placeholdermodule.Register(protected, state)

	return engine
}
