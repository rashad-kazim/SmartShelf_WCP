package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/response"
)

const (
	ContextUserIDKey    = "authUserID"
	ContextUserEmailKey = "authUserEmail"
)

func AuthMiddleware(state *appstate.State) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := strings.TrimSpace(c.GetHeader("Authorization"))
		token := ""
		isNotificationStream := strings.HasSuffix(c.FullPath(), "/notifications/stream")
		if strings.HasPrefix(strings.ToLower(header), "bearer ") {
			token = strings.TrimSpace(header[7:])
		}
		if token == "" && isNotificationStream {
			streamToken := strings.TrimSpace(c.Query("stream_token"))
			if streamToken == "" {
				response.Failure(c, http.StatusUnauthorized, "missing_authorization", "Authorization header is required.")
				c.Abort()
				return
			}
			session, found, err := state.SessionByNotificationStreamToken(c.Request.Context(), streamToken)
			if err != nil {
				response.Failure(c, http.StatusInternalServerError, "session_failed", err.Error())
				c.Abort()
				return
			}
			if !found {
				response.Failure(c, http.StatusUnauthorized, "invalid_session", "Access token is invalid.")
				c.Abort()
				return
			}

			c.Set(ContextUserIDKey, session.UserID)
			c.Set(ContextUserEmailKey, session.Email)
			c.Next()
			return
		}
		if token == "" {
			cookieValue, err := c.Cookie("wcp_access_token")
			if err == nil {
				token = strings.TrimSpace(cookieValue)
			}
		}
		if token == "" {
			response.Failure(c, http.StatusUnauthorized, "missing_authorization", "Authorization header is required.")
			c.Abort()
			return
		}
		session, found, err := state.SessionByAccessToken(c.Request.Context(), token)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "session_failed", err.Error())
			c.Abort()
			return
		}
		if !found {
			response.Failure(c, http.StatusUnauthorized, "invalid_session", "Access token is invalid.")
			c.Abort()
			return
		}

		c.Set(ContextUserIDKey, session.UserID)
		c.Set(ContextUserEmailKey, session.Email)
		c.Next()
	}
}
