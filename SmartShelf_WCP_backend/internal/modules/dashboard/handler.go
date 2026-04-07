package dashboard

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/response"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.GET("/summary", func(c *gin.Context) {
		summary, err := state.Dashboard(c.Request.Context(), appstate.DashboardQueryArgs{
			Range:   appstate.DashboardRange(strings.TrimSpace(c.DefaultQuery("range", "7d"))),
			Country: strings.TrimSpace(c.DefaultQuery("country", "all")),
			City:    strings.TrimSpace(c.DefaultQuery("city", "all")),
		})
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "dashboard_summary_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, summary)
	})

	router.GET("/activity-feed", func(c *gin.Context) {
		items, err := state.ActivityFeed(c.Request.Context())
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "activity_feed_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, items)
	})
}
