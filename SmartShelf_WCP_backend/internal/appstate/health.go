package appstate

import "context"

func (s *State) Health(ctx context.Context) map[string]HealthCheck {
	result := map[string]HealthCheck{
		"postgres": {Status: "ok"},
		"redis":    {Status: "ok"},
		"minio":    {Status: "ok"},
	}

	healthCtx, cancel := withTimeout(ctx)
	defer cancel()

	if err := s.db.Ping(healthCtx); err != nil {
		result["postgres"] = HealthCheck{Status: "down", Message: err.Error()}
	}
	if err := s.redis.Ping(healthCtx).Err(); err != nil {
		result["redis"] = HealthCheck{Status: "down", Message: err.Error()}
	}
	if len(s.cfg.MinIOBuckets) > 0 {
		if _, err := s.minio.BucketExists(healthCtx, s.cfg.MinIOBuckets[0]); err != nil {
			result["minio"] = HealthCheck{Status: "down", Message: err.Error()}
		}
	}

	return result
}
