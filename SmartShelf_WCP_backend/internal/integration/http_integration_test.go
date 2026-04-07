package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"smartshelf/wcp-backend/internal/appstate"
	"smartshelf/wcp-backend/internal/config"
	"smartshelf/wcp-backend/internal/server"
)

var (
	testServer *httptest.Server
	testState  *appstate.State
	testConfig config.Config
)

type apiEnvelope[T any] struct {
	Data T `json:"data"`
}

type loginResponse struct {
	AccessToken  string                   `json:"access_token"`
	RefreshToken string                   `json:"refresh_token"`
	User         map[string]any           `json:"user"`
	Preferences  appstate.UserPreferences `json:"preferences"`
}

type installationDraftResponse struct {
	ID string `json:"id"`
}

type tokenResponse struct {
	Token string `json:"token"`
}

type connectionResponse struct {
	Connected bool `json:"connected"`
}

type completeResponse struct {
	DraftID  string `json:"draftId"`
	StoreID  int64  `json:"storeId"`
	Status   string `json:"status"`
	Location string `json:"location"`
}

func TestMain(m *testing.M) {
	cfg := config.Load()
	testConfig = cfg
	state, err := appstate.New(context.Background(), cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "integration bootstrap failed: %v\n", err)
		os.Exit(1)
	}
	testState = state
	testServer = httptest.NewServer(server.New(cfg, state))

	code := m.Run()

	testServer.Close()
	testState.Close()
	os.Exit(code)
}

func TestProtectedRoutesRequireAuth(t *testing.T) {
	response := performJSONRequest(t, http.MethodGet, "/api/v1/stores", "", nil, http.StatusUnauthorized)
	if !bytes.Contains(response, []byte(`missing_authorization`)) {
		t.Fatalf("expected missing_authorization, got %s", string(response))
	}
}

func TestHealthzReturnsSecurityHeaders(t *testing.T) {
	request, err := http.NewRequest(http.MethodGet, testServer.URL+"/healthz", nil)
	if err != nil {
		t.Fatalf("request build failed: %v", err)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer response.Body.Close()

	if response.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("missing X-Content-Type-Options header: %+v", response.Header)
	}
	if response.Header.Get("X-Frame-Options") != "DENY" {
		t.Fatalf("missing X-Frame-Options header: %+v", response.Header)
	}
}

func TestPreferencesPersist(t *testing.T) {
	accessToken := loginAdmin(t)

	var before apiEnvelope[appstate.UserPreferences]
	decodeJSON(t, performJSONRequest(t, http.MethodGet, "/api/v1/preferences/me", accessToken, nil, http.StatusOK), &before)

	next := before.Data
	if next.Language == "tr" {
		next.Language = "en"
	} else {
		next.Language = "tr"
	}

	body, _ := json.Marshal(next)
	var updated apiEnvelope[appstate.UserPreferences]
	decodeJSON(t, performJSONRequest(t, http.MethodPatch, "/api/v1/preferences/me", accessToken, body, http.StatusOK), &updated)
	if updated.Data.Language != next.Language {
		t.Fatalf("expected language %s, got %s", next.Language, updated.Data.Language)
	}

	revertBody, _ := json.Marshal(before.Data)
	performJSONRequest(t, http.MethodPatch, "/api/v1/preferences/me", accessToken, revertBody, http.StatusOK)
}

func TestInstallationWorkflowCompletes(t *testing.T) {
	accessToken := loginAdmin(t)
	uniqueStoreName := fmt.Sprintf("Integration Store %d", time.Now().UnixNano())

	draftPayload := map[string]any{
		"country":      "Germany",
		"city":         "Berlin",
		"storeName":    uniqueStoreName,
		"isBranch":     false,
		"branchName":   "",
		"address":      "Integration Street 1, Berlin",
		"allDayOpen":   false,
		"openingHour":  "09:00",
		"closingHour":  "20:00",
		"ownerName":    "Integration",
		"ownerSurname": "Owner",
	}

	var draft apiEnvelope[installationDraftResponse]
	decodeJSON(t, performMapRequest(t, http.MethodPost, "/api/v1/installation-drafts", accessToken, draftPayload, http.StatusCreated, ""), &draft)

	var masterToken apiEnvelope[tokenResponse]
	decodeJSON(t, performJSONRequest(t, http.MethodPost, "/api/v1/installation-drafts/"+draft.Data.ID+"/master-token", accessToken, nil, http.StatusOK), &masterToken)
	if masterToken.Data.Token == "" {
		t.Fatal("master token was empty")
	}

	var connection apiEnvelope[connectionResponse]
	decodeJSON(t, performJSONRequest(t, http.MethodPost, "/api/v1/installation-drafts/"+draft.Data.ID+"/connection-check", accessToken, nil, http.StatusOK), &connection)
	if !connection.Data.Connected {
		t.Fatal("connection check failed")
	}

	var espToken apiEnvelope[tokenResponse]
	decodeJSON(t, performJSONRequest(t, http.MethodPost, "/api/v1/installation-drafts/"+draft.Data.ID+"/esp-token", accessToken, nil, http.StatusOK), &espToken)
	if espToken.Data.Token == "" {
		t.Fatal("esp token was empty")
	}

	saveDevicesPayload := map[string]any{
		"devices": []map[string]any{
			{
				"id":              1,
				"country":         "Germany",
				"city":            "Berlin",
				"storeName":       uniqueStoreName,
				"branchName":      "",
				"espToken":        espToken.Data.Token,
				"screenSize":      "130cm",
				"allDayWork":      false,
				"awakeTime":       "09:00",
				"sleepTime":       "21:00",
				"gatewayIp":       "192.168.1.50",
				"gatewayPort":     "8080",
				"gatewayEndpoint": "/api/v1/ingest",
				"wifiSsid":        "Integration_WiFi",
				"wifiPassword":    "Integration123!",
				"fontSettings": map[string]any{
					"productName":    "24px",
					"priceBefore":    "16px",
					"priceAfter":     "32px",
					"barcode":        "12px",
					"barcodeNumbers": "12px",
				},
				"status":         "pending",
				"statusCode":     0,
				"lastReportType": "handshake",
				"socTemp":        24.5,
			},
		},
	}
	performMapRequest(t, http.MethodPut, "/api/v1/installation-drafts/"+draft.Data.ID+"/devices", accessToken, saveDevicesPayload, http.StatusOK, "")

	var completed apiEnvelope[completeResponse]
	decodeJSON(t, performMapRequest(t, http.MethodPost, "/api/v1/installation-drafts/"+draft.Data.ID+"/complete", accessToken, nil, http.StatusOK, "integration-complete-"+fmt.Sprint(time.Now().UnixNano())), &completed)
	if completed.Data.StoreID <= 0 {
		t.Fatal("store id was not created")
	}

	performJSONRequest(t, http.MethodGet, fmt.Sprintf("/api/v1/stores/%d/summary", completed.Data.StoreID), accessToken, nil, http.StatusOK)
	performJSONRequest(t, http.MethodDelete, fmt.Sprintf("/api/v1/stores/%d", completed.Data.StoreID), accessToken, nil, http.StatusOK)
}

func TestLoginRateLimitBlocksRepeatedFailures(t *testing.T) {
	uniqueEmail := fmt.Sprintf("blocked-%d@smartshelf.ai", time.Now().UnixNano())
	body := map[string]string{
		"email":    uniqueEmail,
		"password": "wrong-password",
	}

	for attempt := 0; attempt < 8; attempt++ {
		response := performMapRequest(t, http.MethodPost, "/api/v1/auth/login", "", body, http.StatusUnauthorized, "")
		if !bytes.Contains(response, []byte(`invalid_credentials`)) {
			t.Fatalf("expected invalid_credentials, got %s", string(response))
		}
	}

	response := performMapRequest(t, http.MethodPost, "/api/v1/auth/login", "", body, http.StatusTooManyRequests, "")
	if !bytes.Contains(response, []byte(`too_many_login_attempts`)) {
		t.Fatalf("expected too_many_login_attempts, got %s", string(response))
	}
}

func loginAdmin(t *testing.T) string {
	t.Helper()

	body := map[string]string{
		"email":    testConfig.SeedAdminEmail,
		"password": testConfig.SeedAdminPassword,
	}

	var response apiEnvelope[loginResponse]
	decodeJSON(t, performMapRequest(t, http.MethodPost, "/api/v1/auth/login", "", body, http.StatusOK, ""), &response)
	if response.Data.AccessToken == "" {
		t.Fatal("access token was empty")
	}

	return response.Data.AccessToken
}

func performMapRequest(t *testing.T, method, path, accessToken string, body any, expectedStatus int, idempotencyKey string) []byte {
	t.Helper()

	var payload []byte
	if body != nil {
		payload, _ = json.Marshal(body)
	}
	return performRawRequest(t, method, path, accessToken, payload, expectedStatus, idempotencyKey)
}

func performJSONRequest(t *testing.T, method, path, accessToken string, body []byte, expectedStatus int) []byte {
	t.Helper()
	return performRawRequest(t, method, path, accessToken, body, expectedStatus, "")
}

func performRawRequest(t *testing.T, method, path, accessToken string, body []byte, expectedStatus int, idempotencyKey string) []byte {
	t.Helper()

	request, err := http.NewRequest(method, testServer.URL+path, bytes.NewReader(body))
	if err != nil {
		t.Fatalf("request build failed: %v", err)
	}
	request.Header.Set("Content-Type", "application/json")
	if accessToken != "" {
		request.Header.Set("Authorization", "Bearer "+accessToken)
	}
	if idempotencyKey != "" {
		request.Header.Set("Idempotency-Key", idempotencyKey)
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer response.Body.Close()

	raw, err := ioReadAll(response.Body)
	if err != nil {
		t.Fatalf("response read failed: %v", err)
	}
	if response.StatusCode != expectedStatus {
		t.Fatalf("expected status %d, got %d, body=%s", expectedStatus, response.StatusCode, string(raw))
	}

	return raw
}

func decodeJSON[T any](t *testing.T, raw []byte, target *T) {
	t.Helper()
	if err := json.Unmarshal(raw, target); err != nil {
		t.Fatalf("json decode failed: %v raw=%s", err, string(raw))
	}
}

func ioReadAll(body io.Reader) ([]byte, error) {
	return io.ReadAll(body)
}
