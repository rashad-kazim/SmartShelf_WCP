package preferences

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/middleware"
	"smartshelf/wcp-backend/internal/httpx/response"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.GET("/me", func(c *gin.Context) {
		userIDValue, _ := c.Get(middleware.ContextUserIDKey)
		userID, _ := userIDValue.(int64)

		item, err := state.PreferencesByUserID(c.Request.Context(), userID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "preferences_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, item)
	})

	router.PATCH("/me", func(c *gin.Context) {
		userIDValue, _ := c.Get(middleware.ContextUserIDKey)
		userID, _ := userIDValue.(int64)

		var request appstate.UserPreferences
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Preferences payload is invalid.")
			return
		}
		if err := appstate.ValidatePreferences(request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_preferences", err.Error())
			return
		}

		item, err := state.UpsertPreferences(c.Request.Context(), userID, request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "preferences_update_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, item)
	})
}
