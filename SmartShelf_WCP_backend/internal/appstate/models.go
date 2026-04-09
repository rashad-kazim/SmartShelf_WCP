package appstate

import "time"

type AuthUser struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Email       string        `json:"email"`
	Role        string        `json:"role"`
	Permissions []string      `json:"permissions"`
	Scope       PermissionSet `json:"scope"`
	Preferences UserPreferences `json:"preferences"`
}

type PermissionSet struct {
	AllCountries bool     `json:"all_countries"`
	Countries    []string `json:"countries"`
}

type CountryOption struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type DashboardRange string

const (
	DashboardRange7d  DashboardRange = "7d"
	DashboardRange30d DashboardRange = "30d"
)

type DashboardQueryArgs struct {
	Range   DashboardRange
	Country string
	City    string
}

type DashboardTrendPoint struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type DashboardHighlight struct {
	ID       string `json:"id"`
	TitleKey string `json:"titleKey"`
	Value    string `json:"value"`
	Tone     string `json:"tone"`
}

type DashboardSummary struct {
	CountriesCount     int                  `json:"countriesCount"`
	CitiesCount        int                  `json:"citiesCount"`
	TotalDevices       int                  `json:"totalDevices"`
	CriticalErrors     int                  `json:"criticalErrors"`
	PendingAckCount    int                  `json:"pendingAckCount"`
	StoresAddedTotal   int                  `json:"storesAddedTotal"`
	AddedStoresTrend   []DashboardTrendPoint `json:"addedStoresTrend"`
	CriticalErrorsTrend []DashboardTrendPoint `json:"criticalErrorsTrend"`
	Highlights         []DashboardHighlight `json:"highlights"`
	AvailableCountries []string             `json:"availableCountries"`
	AvailableCities    []string             `json:"availableCities"`
}

type ActivityItem struct {
	ID         string    `json:"id"`
	MessageKey string    `json:"messageKey"`
	DetailsKey string    `json:"detailsKey"`
	TimeKey    string    `json:"timeKey"`
	OccurredAt time.Time `json:"occurred_at,omitempty"`
}

type Notification struct {
	ID             string     `json:"id"`
	TitleKey       string     `json:"titleKey"`
	DescriptionKey string     `json:"descriptionKey"`
	TimeKey        string     `json:"timeKey"`
	Category       string     `json:"category"`
	Severity       string     `json:"severity"`
	EventType      string     `json:"eventType"`
	EntityID       string     `json:"entityId"`
	IsRead         bool       `json:"isRead"`
	RequiresAck    bool       `json:"requiresAck"`
	AcknowledgedAt *time.Time `json:"acknowledgedAt"`
	SilencedAt     *time.Time `json:"silencedAt"`
	Href           string     `json:"href"`
	CreatedAt      time.Time  `json:"created_at,omitempty"`
}

type UserPreferences struct {
	Language         string `json:"language"`
	Theme            string `json:"theme"`
	SidebarCollapsed bool   `json:"sidebarCollapsed"`
}

type Store struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Country      string    `json:"country"`
	City         string    `json:"city"`
	Status       string    `json:"status"`
	Devices      int       `json:"devices"`
	Address      string    `json:"address,omitempty"`
	BranchName   string    `json:"branch_name,omitempty"`
	OpeningHour  string    `json:"opening_hour,omitempty"`
	ClosingHour  string    `json:"closing_hour,omitempty"`
	OwnerName    string    `json:"owner_name,omitempty"`
	OwnerSurname string    `json:"owner_surname,omitempty"`
	CreatedAt    time.Time `json:"created_at,omitempty"`
}

type Layer2Summary struct {
	StoreID         int64      `json:"store_id"`
	Layer2ID        string     `json:"layer2_id"`
	Layer1Version   string     `json:"layer1_version"`
	Layer2Version   string     `json:"layer2_version"`
	ESP32Count      int        `json:"esp32_count"`
	Status          string     `json:"status"`
	LastHeartbeatAt *time.Time `json:"last_heartbeat_at"`
	LastSyncAt      *time.Time `json:"last_sync_at"`
	SyncStatus      string     `json:"sync_status"`
	PendingSyncData int        `json:"pending_sync_data"`
	GatewayIP       string     `json:"gateway_ip"`
	GatewayPort     int        `json:"gateway_port"`
	GatewayEndpoint string     `json:"gateway_endpoint"`
}

type DeviceLog struct {
	ID             int64     `json:"id,omitempty"`
	StoreID        int64     `json:"store_id,omitempty"`
	DeviceID       string    `json:"device_id"`
	Firmware       string    `json:"firmware"`
	Battery        int       `json:"battery"`
	Voltage        float64   `json:"voltage"`
	RSSI           int       `json:"rssi"`
	ReportIndex    string    `json:"report_index"`
	ReportType     string    `json:"report_type"`
	StatusCode     int       `json:"status_code"`
	SocTemp        float64   `json:"soc_temp"`
	LoggedAt       time.Time `json:"logged_at"`
}

type DeviceLogFilter struct {
	Date          string
	PacketIndex   string
	BatteryStatus string
	ReportType    string
	StatusCode    string
	CriticalOnly  bool
	Page          int
	Limit         int
}

type User struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Surname   string  `json:"surname"`
	Avatar    *string `json:"avatar"`
	Email     string  `json:"email"`
	Role      string  `json:"role"`
	Country   string  `json:"country"`
	City      string  `json:"city"`
	Workplace string  `json:"workplace"`
	Kind      string  `json:"kind,omitempty"`
}

type UserUpsert struct {
	Name      string  `json:"name"`
	Surname   string  `json:"surname"`
	Avatar    *string `json:"avatar"`
	Email     string  `json:"email"`
	Role      string  `json:"role"`
	Country   string  `json:"country"`
	City      string  `json:"city"`
	Workplace string  `json:"workplace"`
}

type InstallationDraft struct {
	ID             string     `json:"id"`
	Country        string     `json:"country"`
	City           string     `json:"city"`
	StoreName      string     `json:"storeName"`
	IsBranch       bool       `json:"isBranch"`
	BranchName     string     `json:"branchName"`
	Address        string     `json:"address"`
	AllDayOpen     bool       `json:"allDayOpen"`
	OpeningHour    string     `json:"openingHour"`
	ClosingHour    string     `json:"closingHour"`
	OwnerName      string     `json:"ownerName"`
	OwnerSurname   string     `json:"ownerSurname"`
	MasterTokenSet bool       `json:"masterTokenSet"`
	ESPTokenSet    bool       `json:"espTokenSet"`
	ConnectionOK   bool       `json:"connectionOk"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	CompletedAt    *time.Time `json:"completedAt"`
}

type DeviceFontSettings struct {
	ProductName    string `json:"productName"`
	PriceBefore    string `json:"priceBefore"`
	PriceAfter     string `json:"priceAfter"`
	Barcode        string `json:"barcode"`
	BarcodeNumbers string `json:"barcodeNumbers"`
}

type DraftDevice struct {
	ID              int64              `json:"id"`
	Country         string             `json:"country"`
	City            string             `json:"city"`
	StoreName       string             `json:"storeName"`
	BranchName      string             `json:"branchName"`
	ESPToken        string             `json:"espToken"`
	ScreenSize      string             `json:"screenSize"`
	AllDayWork      bool               `json:"allDayWork"`
	AwakeTime       string             `json:"awakeTime"`
	SleepTime       string             `json:"sleepTime"`
	GatewayIP       string             `json:"gatewayIp"`
	GatewayPort     string             `json:"gatewayPort"`
	GatewayEndpoint string             `json:"gatewayEndpoint"`
	WifiSSID        string             `json:"wifiSsid"`
	WifiPassword    string             `json:"wifiPassword"`
	FontSettings    DeviceFontSettings `json:"fontSettings"`
	Status          string             `json:"status"`
	StatusCode      int                `json:"statusCode"`
	LastReportType  string             `json:"lastReportType"`
	SocTemp         float64            `json:"socTemp"`
}

type StoreDevice struct {
	ID              int64              `json:"id"`
	StoreID         int64              `json:"storeId"`
	Country         string             `json:"country"`
	City            string             `json:"city"`
	StoreName       string             `json:"storeName"`
	BranchName      string             `json:"branchName"`
	ESPToken        string             `json:"espToken"`
	ScreenSize      string             `json:"screenSize"`
	AllDayWork      bool               `json:"allDayWork"`
	AwakeTime       string             `json:"awakeTime"`
	SleepTime       string             `json:"sleepTime"`
	GatewayIP       string             `json:"gatewayIp"`
	GatewayPort     string             `json:"gatewayPort"`
	GatewayEndpoint string             `json:"gatewayEndpoint"`
	WifiSSID        string             `json:"wifiSsid"`
	WifiPassword    string             `json:"wifiPassword"`
	FontSettings    DeviceFontSettings `json:"fontSettings"`
	Status          string             `json:"status"`
	StatusCode      int                `json:"statusCode"`
	LastReportType  string             `json:"lastReportType"`
	SocTemp         float64            `json:"socTemp"`
}

type StoreUpsert struct {
	Country      string `json:"country"`
	City         string `json:"city"`
	StoreName    string `json:"storeName"`
	IsBranch     bool   `json:"isBranch"`
	BranchName   string `json:"branchName"`
	Address      string `json:"address"`
	AllDayOpen   bool   `json:"allDayOpen"`
	OpeningHour  string `json:"openingHour"`
	ClosingHour  string `json:"closingHour"`
	OwnerName    string `json:"ownerName"`
	OwnerSurname string `json:"ownerSurname"`
}

type CompleteInstallationResult struct {
	DraftID  string `json:"draftId"`
	StoreID  int64  `json:"storeId"`
	Status   string `json:"status"`
	Location string `json:"location"`
}

type SyncPayload struct {
	BatchID string      `json:"batch_id"`
	StoreID int64       `json:"store_id"`
	Logs    []DeviceLog `json:"logs"`
}

type HealthCheck struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}
