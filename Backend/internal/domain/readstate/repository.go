package readstate

import (
	"context"
)

type Repository interface {
	Upsert(ctx context.Context, rs *ReadState) error
	Get(ctx context.Context, userID, channelID string) (*ReadState, error)
	GetByChannelID(ctx context.Context, channelID string) ([]*ReadState, error)
}
