package auth

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/middleware"
	"smartshelf/wcp-backend/internal/httpx/response"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

const (
	accessCookieName  = "wcp_access_token"
	refreshCookieName = "wcp_refresh_token"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.POST("/login", func(c *gin.Context) {
		var request loginRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Login payload is invalid.")
			return
		}

		email := strings.ToLower(strings.TrimSpace(request.Email))
		password := strings.TrimSpace(request.Password)
		clientIP := strings.TrimSpace(c.ClientIP())

		if email == "" || password == "" {
			response.Failure(c, http.StatusBadRequest, "missing_credentials", "Email and password are required.")
			return
		}

		limited, err := state.TooManyLoginAttempts(c.Request.Context(), email, clientIP)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "auth_failed", err.Error())
			return
		}
		if limited {
			response.Failure(c, http.StatusTooManyRequests, "too_many_login_attempts", "Too many failed login attempts. Try again later.")
			return
		}

		user, authResult, err := state.AuthenticateAdmin(c.Request.Context(), email, password)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "auth_failed", err.Error())
			return
		}
		if authResult != appstate.AdminAuthSuccess {
			_ = state.RegisterFailedLogin(c.Request.Context(), email, clientIP)
			switch authResult {
			case appstate.AdminAuthEmailNotFound:
				response.Failure(c, http.StatusUnauthorized, "email_not_registered", "Email address is not registered.")
			case appstate.AdminAuthWrongPassword:
				response.Failure(c, http.StatusUnauthorized, "password_incorrect", "Password is incorrect.")
			case appstate.AdminAuthForbiddenAccount:
				response.Failure(c, http.StatusForbidden, "wcp_access_denied", "This account does not have permission to access WCP.")
			default:
				response.Failure(c, http.StatusUnauthorized, "invalid_credentials", "Email or password is invalid.")
			}
			return
		}
		_ = state.ResetLoginAttempts(c.Request.Context(), email, clientIP)

		userID, err := strconv.ParseInt(user.ID, 10, 64)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "auth_failed", "User id is invalid.")
			return
		}
		session, err := state.CreateSession(c.Request.Context(), userID, user.Email)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "auth_failed", err.Error())
			return
		}
		setAuthCookies(c, session)

		response.Success(c, http.StatusOK, gin.H{
			"access_token":  session.AccessToken,
			"refresh_token": session.RefreshToken,
			"user":          user,
			"permissions":   user.Permissions,
			"preferences":   user.Preferences,
		})
	})

	router.POST("/refresh", func(c *gin.Context) {
		var request refreshRequest
		if err := c.ShouldBindJSON(&request); err != nil && err != io.EOF {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Refresh payload is invalid.")
			return
		}
		refreshToken := strings.TrimSpace(request.RefreshToken)
		if refreshToken == "" {
			cookieValue, cookieErr := c.Cookie(refreshCookieName)
			if cookieErr == nil {
				refreshToken = strings.TrimSpace(cookieValue)
			}
		}
		session, found, err := state.RefreshSession(c.Request.Context(), refreshToken)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "refresh_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusUnauthorized, "invalid_refresh_token", "Refresh token is invalid.")
			return
		}
		setAuthCookies(c, session)
		user, found, err := state.AdminByID(c.Request.Context(), session.UserID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "refresh_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusUnauthorized, "invalid_refresh_token", "Refresh token is invalid.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{
			"access_token":  session.AccessToken,
			"refresh_token": session.RefreshToken,
			"user":          user,
			"permissions":   user.Permissions,
			"preferences":   user.Preferences,
		})
	})

	router.POST("/logout", func(c *gin.Context) {
		var request refreshRequest
		_ = c.ShouldBindJSON(&request)
		refreshToken := strings.TrimSpace(request.RefreshToken)
		if refreshToken == "" {
			cookieValue, cookieErr := c.Cookie(refreshCookieName)
			if cookieErr == nil {
				refreshToken = strings.TrimSpace(cookieValue)
			}
		}
		if refreshToken != "" {
			session, found, err := state.SessionByRefreshToken(c.Request.Context(), refreshToken)
			if err == nil && found {
				_ = state.DeleteSession(c.Request.Context(), session)
			}
		}
		clearAuthCookies(c)
		response.Success(c, http.StatusOK, gin.H{
			"status": "logged_out",
		})
	})

	protected := router.Group("")
	protected.Use(middleware.AuthMiddleware(state))

	protected.GET("/me", func(c *gin.Context) {
		userIDValue, _ := c.Get(middleware.ContextUserIDKey)
		userID, _ := userIDValue.(int64)

		user, found, err := state.AdminByID(c.Request.Context(), userID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "user_not_found", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusUnauthorized, "invalid_session", "Session is invalid.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{
			"user":        user,
			"permissions": user.Permissions,
			"preferences": user.Preferences,
		})
	})
}

func setAuthCookies(c *gin.Context, session appstate.Session) {
	secure := c.Request.TLS != nil || strings.EqualFold(c.Request.Header.Get("X-Forwarded-Proto"), "https")
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(accessCookieName, session.AccessToken, int((12 * 60 * 60)), "/", "", secure, true)
	c.SetCookie(refreshCookieName, session.RefreshToken, int((30 * 24 * 60 * 60)), "/", "", secure, true)
}

func clearAuthCookies(c *gin.Context) {
	secure := c.Request.TLS != nil || strings.EqualFold(c.Request.Header.Get("X-Forwarded-Proto"), "https")
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(accessCookieName, "", -1, "/", "", secure, true)
	c.SetCookie(refreshCookieName, "", -1, "/", "", secure, true)
}
