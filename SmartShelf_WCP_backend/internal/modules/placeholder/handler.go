package placeholder

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/httpx/response"
)

type draftDevicesRequest struct {
	Devices []appstate.DraftDevice `json:"devices"`
}

func Register(router *gin.RouterGroup, state *appstate.State) {
	router.POST("/installation-drafts", func(c *gin.Context) {
		var request appstate.InstallationDraft
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Installation draft payload is invalid.")
			return
		}
		if err := appstate.ValidateInstallationDraft(request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_installation_draft", err.Error())
			return
		}
		item, err := state.CreateInstallationDraft(c.Request.Context(), request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "installation_draft_create_failed", err.Error())
			return
		}
		response.Success(c, http.StatusCreated, item)
	})

	router.PATCH("/installation-drafts/:id", func(c *gin.Context) {
		var request appstate.InstallationDraft
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Installation draft payload is invalid.")
			return
		}
		if err := appstate.ValidateInstallationDraft(request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_installation_draft", err.Error())
			return
		}
		item, found, err := state.UpdateInstallationDraft(c.Request.Context(), c.Param("id"), request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "installation_draft_update_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "installation_draft_not_found", "Installation draft was not found.")
			return
		}
		response.Success(c, http.StatusOK, item)
	})

	router.POST("/installation-drafts/:id/master-token", func(c *gin.Context) {
		token, found, err := state.GenerateMasterToken(c.Request.Context(), c.Param("id"))
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "master_token_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "installation_draft_not_found", "Installation draft was not found.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{"token": token})
	})

	router.POST("/installation-drafts/:id/connection-check", func(c *gin.Context) {
		ok, err := state.CheckDraftConnection(c.Request.Context(), c.Param("id"))
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "connection_check_failed", err.Error())
			return
		}
		if !ok {
			response.Failure(c, http.StatusNotFound, "installation_draft_not_found", "Installation draft was not found.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{"connected": true})
	})

	router.POST("/installation-drafts/:id/esp-token", func(c *gin.Context) {
		token, found, err := state.GenerateESPToken(c.Request.Context(), c.Param("id"))
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "esp_token_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "installation_draft_not_found", "Installation draft was not found.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{"token": token})
	})

	router.PUT("/installation-drafts/:id/devices", func(c *gin.Context) {
		var request draftDevicesRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Draft devices payload is invalid.")
			return
		}
		if err := appstate.ValidateDraftDevices(request.Devices); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_draft_devices", err.Error())
			return
		}
		count, found, err := state.SaveDraftDevices(c.Request.Context(), c.Param("id"), request.Devices)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "installation_draft_devices_failed", err.Error())
			return
		}
		if !found {
			response.Failure(c, http.StatusNotFound, "installation_draft_not_found", "Installation draft was not found.")
			return
		}
		response.Success(c, http.StatusOK, gin.H{"saved_count": count})
	})

	router.POST("/installation-drafts/:id/complete", func(c *gin.Context) {
		idempotencyKey := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
		if idempotencyKey == "" {
			response.Failure(c, http.StatusBadRequest, "missing_idempotency_key", "Idempotency-Key header is required for installation completion.")
			return
		}

		result, err := state.CompleteInstallation(c.Request.Context(), c.Param("id"), idempotencyKey)
		if err != nil {
			if err == appstate.ErrNotFound() {
				response.Failure(c, http.StatusNotFound, "installation_draft_not_found", "Installation draft was not found.")
				return
			}
			response.Failure(c, http.StatusInternalServerError, "installation_complete_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, result)
	})

	router.GET("/firmware/releases", notImplemented("firmware module sonraki fazda eklenecek"))
	router.POST("/firmware/releases", notImplemented("firmware module sonraki fazda eklenecek"))
	router.POST("/firmware/releases/:id/binary-upload", notImplemented("firmware uploads sonraki fazda eklenecek"))
	router.POST("/firmware/releases/:id/rollouts", notImplemented("firmware rollouts sonraki fazda eklenecek"))

	router.POST("/layer2/heartbeat", func(c *gin.Context) {
		var request appstate.HeartbeatPayload
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Heartbeat payload is invalid.")
			return
		}
		if request.StoreID <= 0 {
			response.Failure(c, http.StatusBadRequest, "invalid_heartbeat", "Store id is required.")
			return
		}
		err := state.IngestHeartbeat(c.Request.Context(), request)
		if err != nil {
			if err == appstate.ErrNotFound() {
				response.Failure(c, http.StatusNotFound, "store_not_found", "Store was not found.")
				return
			}
			response.Failure(c, http.StatusInternalServerError, "heartbeat_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{"status": "accepted"})
	})

	router.POST("/layer2/sync", func(c *gin.Context) {
		var request appstate.SyncPayload
		if err := c.ShouldBindJSON(&request); err != nil {
			response.Failure(c, http.StatusBadRequest, "invalid_payload", "Sync payload is invalid.")
			return
		}
		if strings.TrimSpace(request.BatchID) == "" || request.StoreID <= 0 {
			response.Failure(c, http.StatusBadRequest, "invalid_sync", "Batch id and store id are required.")
			return
		}
		status, err := state.IngestSync(c.Request.Context(), request)
		if err != nil {
			response.Failure(c, http.StatusInternalServerError, "sync_failed", err.Error())
			return
		}
		response.Success(c, http.StatusOK, gin.H{"status": status, "acknowledged": true})
	})
}

func notImplemented(message string) gin.HandlerFunc {
	return func(c *gin.Context) {
		response.Failure(c, http.StatusNotImplemented, "not_implemented", message)
	}
}
