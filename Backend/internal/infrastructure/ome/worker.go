package ome

import (
	"context"
	"log/slog"
	"time"

	"pink/internal/domain/live"
)

// Worker handles periodic tasks for OME integration.
type Worker struct {
	client     *Client
	streamRepo live.StreamRepository
	logger     *slog.Logger
	interval   time.Duration
}

// NewWorker creates a new OME worker.
func NewWorker(client *Client, streamRepo live.StreamRepository, logger *slog.Logger) *Worker {
	return &Worker{
		client:     client,
		streamRepo: streamRepo,
		logger:     logger,
		interval:   15 * time.Second,
	}
}

// Start starts the worker.
func (w *Worker) Start(ctx context.Context) {
	w.logger.Info("OME worker started")
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.logger.Info("OME worker stopped")
			return
		case <-ticker.C:
			w.syncViewerCounts(ctx)
		}
	}
}

func (w *Worker) syncViewerCounts(ctx context.Context) {
	// Sync timeout
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Get all live streams
	// Loop through pages
	limit := 100
	cursor := ""

	for {
		streams, nextCursor, err := w.streamRepo.FindLive(ctx, cursor, limit)
		if err != nil {
			w.logger.Error("Failed to fetch live streams", "error", err)
			return
		}

		if len(streams) == 0 {
			break
		}

		for _, stream := range streams {
			w.updateStreamStats(ctx, stream)
		}

		if nextCursor == "" {
			break
		}
		cursor = nextCursor
	}
}

func (w *Worker) updateStreamStats(ctx context.Context, stream *live.Stream) {
	// OME uses "app" name, usually configured in Server.xml. Default is "app".
	// We might need to make this configurable.
	vhost := "default"
	app := "app"

	details, err := w.client.GetStreamDetails(vhost, app, stream.StreamKey)
	if err != nil {
		// Log debug only to avoid spam if stream just ended but DB not updated yet
		w.logger.Debug("Failed to get stream details from OME", "stream_id", stream.ID, "key", stream.StreamKey, "error", err)
		return
	}

	if details.TotalConnections != stream.ViewerCount {
		stream.ViewerCount = details.TotalConnections
		// We should have a specialized UpdateViewerCount method, but Update is fine for now
		if err := w.streamRepo.Update(ctx, stream); err != nil {
			w.logger.Error("Failed to update viewer count", "stream_id", stream.ID, "error", err)
		} else {
			w.logger.Debug("Updated viewer count", "stream_id", stream.ID, "count", details.TotalConnections)
		}
	}
}
