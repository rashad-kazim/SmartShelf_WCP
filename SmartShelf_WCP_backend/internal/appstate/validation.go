package appstate

import (
	"fmt"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
)

var (
	timePattern    = regexp.MustCompile(`^\d{2}:\d{2}$`)
	ipPattern      = regexp.MustCompile(`^\d{1,3}(\.\d{1,3}){3}$`)
	deviceStatuses = map[string]struct{}{
		"pending": {}, "paired": {}, "active": {}, "offline": {}, "unhealthy": {}, "revoked": {}, "decommissioned": {},
	}
	reportTypes = map[string]struct{}{
		"scheduled": {}, "alert": {}, "handshake": {},
	}
)

func ValidateUserUpsert(input UserUpsert, requireWorkplace bool) error {
	if strings.TrimSpace(input.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if strings.TrimSpace(input.Surname) == "" {
		return fmt.Errorf("surname is required")
	}
	if _, err := mail.ParseAddress(strings.TrimSpace(input.Email)); err != nil {
		return fmt.Errorf("email is invalid")
	}
	if strings.TrimSpace(input.Role) == "" {
		return fmt.Errorf("role is required")
	}
	if strings.TrimSpace(input.Country) == "" {
		return fmt.Errorf("country is required")
	}
	if strings.TrimSpace(input.City) == "" {
		return fmt.Errorf("city is required")
	}
	if requireWorkplace && strings.TrimSpace(input.Workplace) == "" {
		return fmt.Errorf("workplace is required")
	}
	return nil
}

func ValidateStoreUpsert(input StoreUpsert) error {
	if strings.TrimSpace(input.Country) == "" {
		return fmt.Errorf("country is required")
	}
	if strings.TrimSpace(input.City) == "" {
		return fmt.Errorf("city is required")
	}
	if strings.TrimSpace(input.StoreName) == "" {
		return fmt.Errorf("store name is required")
	}
	if input.IsBranch && strings.TrimSpace(input.BranchName) == "" {
		return fmt.Errorf("branch name is required")
	}
	if strings.TrimSpace(input.Address) == "" {
		return fmt.Errorf("address is required")
	}
	if !input.AllDayOpen {
		if !timePattern.MatchString(strings.TrimSpace(input.OpeningHour)) {
			return fmt.Errorf("opening hour is invalid")
		}
		if !timePattern.MatchString(strings.TrimSpace(input.ClosingHour)) {
			return fmt.Errorf("closing hour is invalid")
		}
	}
	if strings.TrimSpace(input.OwnerName) == "" {
		return fmt.Errorf("owner name is required")
	}
	if strings.TrimSpace(input.OwnerSurname) == "" {
		return fmt.Errorf("owner surname is required")
	}
	return nil
}

func ValidateInstallationDraft(input InstallationDraft) error {
	return ValidateStoreUpsert(StoreUpsert{
		Country:      input.Country,
		City:         input.City,
		StoreName:    input.StoreName,
		IsBranch:     input.IsBranch,
		BranchName:   input.BranchName,
		Address:      input.Address,
		AllDayOpen:   input.AllDayOpen,
		OpeningHour:  input.OpeningHour,
		ClosingHour:  input.ClosingHour,
		OwnerName:    input.OwnerName,
		OwnerSurname: input.OwnerSurname,
	})
}

func ValidateDraftDevices(devices []DraftDevice) error {
	if len(devices) == 0 {
		return fmt.Errorf("at least one device is required")
	}
	for _, device := range devices {
		if err := validateDraftDevice(device); err != nil {
			return fmt.Errorf("device %d: %w", device.ID, err)
		}
	}
	return nil
}

func ValidateStoreDevices(devices []StoreDevice) error {
	if len(devices) == 0 {
		return fmt.Errorf("at least one device is required")
	}
	for _, device := range devices {
		if err := validateStoreDevice(device); err != nil {
			return fmt.Errorf("device %d: %w", device.ID, err)
		}
	}
	return nil
}

func ValidatePreferences(input UserPreferences) error {
	if input.Language == "" {
		return fmt.Errorf("language is required")
	}
	switch input.Theme {
	case "light", "dark":
	default:
		return fmt.Errorf("theme is invalid")
	}
	return nil
}

func validateDraftDevice(device DraftDevice) error {
	if device.ID <= 0 {
		return fmt.Errorf("device id is invalid")
	}
	if strings.TrimSpace(device.Country) == "" || strings.TrimSpace(device.City) == "" {
		return fmt.Errorf("device location is required")
	}
	if strings.TrimSpace(device.StoreName) == "" {
		return fmt.Errorf("store name is required")
	}
	if strings.TrimSpace(device.ScreenSize) == "" {
		return fmt.Errorf("screen size is required")
	}
	if !device.AllDayWork {
		if !timePattern.MatchString(strings.TrimSpace(device.AwakeTime)) {
			return fmt.Errorf("awake time is invalid")
		}
		if !timePattern.MatchString(strings.TrimSpace(device.SleepTime)) {
			return fmt.Errorf("sleep time is invalid")
		}
	}
	if !ipPattern.MatchString(strings.TrimSpace(device.GatewayIP)) {
		return fmt.Errorf("gateway ip is invalid")
	}
	if strings.TrimSpace(device.GatewayPort) == "" {
		return fmt.Errorf("gateway port is required")
	}
	if _, err := url.ParseRequestURI("http://example.com" + strings.TrimSpace(device.GatewayEndpoint)); err != nil {
		return fmt.Errorf("gateway endpoint is invalid")
	}
	if strings.TrimSpace(device.WifiSSID) == "" {
		return fmt.Errorf("wifi ssid is required")
	}
	if strings.TrimSpace(device.WifiPassword) == "" {
		return fmt.Errorf("wifi password is required")
	}
	if _, ok := deviceStatuses[strings.TrimSpace(device.Status)]; !ok {
		return fmt.Errorf("device status is invalid")
	}
	if _, ok := reportTypes[strings.TrimSpace(device.LastReportType)]; !ok {
		return fmt.Errorf("report type is invalid")
	}
	return nil
}

func validateStoreDevice(device StoreDevice) error {
	return validateDraftDevice(DraftDevice{
		ID:              device.ID,
		Country:         device.Country,
		City:            device.City,
		StoreName:       device.StoreName,
		BranchName:      device.BranchName,
		ESPToken:        device.ESPToken,
		ScreenSize:      device.ScreenSize,
		AllDayWork:      device.AllDayWork,
		AwakeTime:       device.AwakeTime,
		SleepTime:       device.SleepTime,
		GatewayIP:       device.GatewayIP,
		GatewayPort:     device.GatewayPort,
		GatewayEndpoint: device.GatewayEndpoint,
		WifiSSID:        device.WifiSSID,
		WifiPassword:    device.WifiPassword,
		FontSettings:    device.FontSettings,
		Status:          device.Status,
		StatusCode:      device.StatusCode,
		LastReportType:  device.LastReportType,
		SocTemp:         device.SocTemp,
	})
}
