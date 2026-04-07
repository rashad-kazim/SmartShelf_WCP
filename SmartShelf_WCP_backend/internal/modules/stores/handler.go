package stores

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/response"
)

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.GET("", func(c *gin.Context) {
		page := intQuery(c, "page", 1)
		limit := intQuery(c, "limit", 20)

		items, total, err := state.Stores(
			c.Request.Context(),
			c.Query("country"),
			c.Query("city"),
			c.Query("supermarket"),
			page,
			limit,
		)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "stores_failed", err.Error())
			return
		}

		response.SuccessWithMeta(c, http.StatusOK, items, gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		})
	})

	router.GET("/:id", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		store, found, err := state.StoreByID(c.Request.Context(), storeID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "store_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "store_not_found", "Store was not found.")
			return
		}

		response.Success(c, http.StatusOK, store)
	})

	router.GET("/:id/summary", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		store, found, err := state.StoreByID(c.Request.Context(), storeID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "store_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "store_not_found", "Store was not found.")
			return
		}

		layer2, found, err := state.Layer2ByStoreID(c.Request.Context(), storeID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "layer2_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "layer2_not_found", "Layer 2 summary was not found.")
			return
		}

		response.Success(c, http.StatusOK, gin.H{
			"store":   store,
			"layer_2": layer2,
		})
	})

	router.GET("/:id/layer2", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		layer2, found, err := state.Layer2ByStoreID(c.Request.Context(), storeID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "layer2_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "layer2_not_found", "Layer 2 summary was not found.")
			return
		}

		response.Success(c, http.StatusOK, layer2)
	})

	router.GET("/:id/devices", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		items, err := state.StoreDevices(c.Request.Context(), storeID)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "store_devices_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, items)
	})

	router.GET("/:id/device-logs", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		page := intQuery(c, "page", 1)
		limit := intQuery(c, "limit", 20)
		filter := appstate.DeviceLogFilter{
			Date:          strings.TrimSpace(c.Query("date")),
			PacketIndex:   strings.TrimSpace(c.Query("packet_index")),
			BatteryStatus: strings.TrimSpace(c.Query("battery_status")),
			ReportType:    strings.TrimSpace(c.Query("report_type")),
			StatusCode:    strings.TrimSpace(c.Query("status_code")),
			CriticalOnly:  strings.EqualFold(strings.TrimSpace(c.Query("critical_only")), "true"),
			Page:          page,
			Limit:         limit,
		}

		items, total, err := state.DeviceLogs(c.Request.Context(), storeID, filter)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "device_logs_failed", err.Error())
			return
		}
		response.SuccessWithMeta(c, http.StatusOK, items, gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		})
	})

	router.PATCH("/:id", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		var request appstate.StoreUpsert
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Store payload is invalid.")
			return
		}
		if err := appstate.ValidateStoreUpsert(request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_store", err.Error())
			return
		}

		item, found, err := state.UpdateStore(c.Request.Context(), storeID, request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "store_update_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "store_not_found", "Store was not found.")
			return
		}

		response.Success(c, http.StatusOK, item)
	})

	router.PUT("/:id/devices", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}

		var request []appstate.StoreDevice
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Store devices payload is invalid.")
			return
		}
		if err := appstate.ValidateStoreDevices(request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_store_devices", err.Error())
			return
		}
		if err := state.ReplaceStoreDevices(c.Request.Context(), storeID, request); err != nil {
			response.Failure(c, http.StatusInternalServerError, "store_devices_update_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{"saved_count": len(request)})
	})

	router.DELETE("/:id", func(c *gin.Context) {
		storeID, ok := storeIDParam(c)
		if !ok {
			return
		}
		err := state.DeleteStore(c.Request.Context(), storeID)
		if err != nil {
			if err == appstate.ErrNotFound() {
				response.Failure(c, http.StatusNotFound, "store_not_found", "Store was not found.")
				return
			}
			response.Failure(c, http.StatusInternalServerError, "store_delete_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{"status": "deleted"})
	})
}

func storeIDParam(c *gin.Context) (int64, bool) {
	storeID, err := int64Param(c.Param("id"))
	if err != nil {
		response.Failure(c, http.StatusBadRequest, "invalid_store_id", "Store id must be numeric.")
		return 0, false
	}

	return storeID, true
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

func int64Param(value string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(value), 10, 64)
}
