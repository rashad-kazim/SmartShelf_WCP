package reference

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/response"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.GET("/countries", func(c *gin.Context) {
		source := strings.TrimSpace(c.DefaultQuery("source", "stores"))
		items, err := state.Countries(c.Request.Context(), source)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "countries_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, items)
	})

	router.GET("/cities", func(c *gin.Context) {
		source := strings.TrimSpace(c.DefaultQuery("source", "stores"))
		country := strings.TrimSpace(c.Query("country"))
		items, err := state.Cities(c.Request.Context(), source, country)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "cities_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, items)
	})

	router.GET("/supermarkets", func(c *gin.Context) {
		city := strings.TrimSpace(c.Query("city"))
		items, err := state.Supermarkets(c.Request.Context(), city)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "supermarkets_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, items)
	})
}
