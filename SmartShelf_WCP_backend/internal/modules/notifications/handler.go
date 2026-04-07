package notifications

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/middleware"
	"smartshelf/wcp-backend/internal/httpx/response"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.GET("", func(c *gin.Context) {
		page := intQuery(c, "page", 1)
		limit := intQuery(c, "limit", 20)
		unreadOnly := strings.EqualFold(c.Query("unread_only"), "true")

		items, total, err := state.Notifications(c.Request.Context(), page, limit, unreadOnly)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notifications_failed", err.Error())
			return
		}
		unreadCount, err := state.UnreadNotificationCount(c.Request.Context())
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notifications_unread_failed", err.Error())
			return
		}
		response.SuccessWithMeta(c, http.StatusOK, items, gin.H{
			"page":         page,
			"limit":        limit,
			"total":        total,
			"unread_count": unreadCount,
		})
	})

	router.GET("/unread-count", func(c *gin.Context) {
		unreadCount, err := state.UnreadNotificationCount(c.Request.Context())
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notifications_unread_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{
			"unread_count": unreadCount,
		})
	})

	router.GET("/stream-token", func(c *gin.Context) {
		userIDValue, _ := c.Get(middleware.ContextUserIDKey)
		userEmailValue, _ := c.Get(middleware.ContextUserEmailKey)
		userID, _ := userIDValue.(int64)
		userEmail, _ := userEmailValue.(string)

		token, err := state.CreateNotificationStreamToken(c.Request.Context(), userID, userEmail)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "stream_token_failed", err.Error())
			return
		}

		response.Success(c, http.StatusOK, gin.H{"token": token})
	})

	router.GET("/stream", func(c *gin.Context) {
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")

		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		sendEvent := func() {
			unreadCount, err := state.UnreadNotificationCount(c.Request.Context())
			if err != nil {
				return
			}
			c.SSEvent("notification", gin.H{
				"unread_count": unreadCount,
				"timestamp":    time.Now().UTC(),
			})
			c.Writer.Flush()
		}

		sendEvent()
		for {
			select {
			case <-c.Request.Context().Done():
				return
			case <-ticker.C:
				sendEvent()
			}
		}
	})

	router.PATCH("/:id/read", func(c *gin.Context) {
		ok, err := state.MarkNotificationRead(c.Request.Context(), c.Param("id"))
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notification_update_failed", err.Error())
			return
		}
		if !ok {
			response.Failure(c, http.StatusNotFound, "notification_not_found", "Notification was not found.")
			return
		}

		response.Success(c, http.StatusOK, gin.H{
			"status": "read",
		})
	})

	router.POST("/read-all", func(c *gin.Context) {
		markedCount, err := state.MarkAllNotificationsRead(c.Request.Context())
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notification_update_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{
			"marked_count": markedCount,
		})
	})

	router.PATCH("/:id/ack", func(c *gin.Context) {
		ok, err := state.AcknowledgeNotification(c.Request.Context(), c.Param("id"))
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notification_update_failed", err.Error())
			return
		}
		if !ok {
			response.Failure(c, http.StatusNotFound, "notification_not_found", "Notification was not found.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{"status": "acknowledged"})
	})

	router.PATCH("/:id/silence", func(c *gin.Context) {
		ok, err := state.SilenceNotification(c.Request.Context(), c.Param("id"))
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "notification_update_failed", err.Error())
			return
		}
		if !ok {
			response.Failure(c, http.StatusNotFound, "notification_not_found", "Notification was not found.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{"status": "silenced"})
	})
}

func intQuery(c *gin.Context, key string, fallback int) int {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}

	return value
}
