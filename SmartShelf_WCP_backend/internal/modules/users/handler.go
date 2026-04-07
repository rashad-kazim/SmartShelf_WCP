package users

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/response"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	registerUserGroup(router.Group("/company-users"), state, "company")
	registerUserGroup(router.Group("/supermarket-users"), state, "supermarket")
}

func registerUserGroup(router *gin.RouterGroup, state *appstate.State, kind string) {
	router.GET("", func(c *gin.Context) {
		page := intQuery(c, "page", 1)
		limit := intQuery(c, "limit", 20)

		items, total, err := state.UsersByKind(
			c.Request.Context(),
			kind,
			c.Query("country"),
			c.Query("city"),
			c.Query("workplace"),
			page,
			limit,
		)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "users_failed", err.Error())
			return
		}

		response.SuccessWithMeta(c, http.StatusOK, items, gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		})
	})

	router.GET("/:id", func(c *gin.Context) {
		userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_user_id", "User id must be numeric.")
			return
		}

		user, found, err := state.UserByID(c.Request.Context(), kind, userID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "user_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "user_not_found", "User was not found.")
			return
		}

		response.Success(c, http.StatusOK, user)
	})

	router.POST("", func(c *gin.Context) {
		var request appstate.UserUpsert
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "User payload is invalid.")
			return
		}
		if err := appstate.ValidateUserUpsert(request, kind == "supermarket"); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_user", err.Error())
			return
		}

		user, err := state.CreateUser(c.Request.Context(), kind, request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "user_create_failed", err.Error())
			return
		}
		response.Success(c, http.StatusCreated, user)
	})

	router.PATCH("/:id", func(c *gin.Context) {
		userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_user_id", "User id must be numeric.")
			return
		}
		var request appstate.UserUpsert
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "User payload is invalid.")
			return
		}
		if err := appstate.ValidateUserUpsert(request, kind == "supermarket"); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_user", err.Error())
			return
		}

		user, found, err := state.UpdateUser(c.Request.Context(), kind, userID, request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "user_update_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "user_not_found", "User was not found.")
			return
		}
		response.Success(c, http.StatusOK, user)
	})

	router.DELETE("/:id", func(c *gin.Context) {
		userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
		if err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_user_id", "User id must be numeric.")
			return
		}
		err = state.DeleteUser(c.Request.Context(), kind, userID)
		if err != nil {
			if err == appstate.ErrNotFound() {
				response.Failure(c, http.StatusNotFound, "user_not_found", "User was not found.")
				return
			}
			response.Failure(c, http.StatusInternalServerError, "user_delete_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{"status": "deleted"})
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
