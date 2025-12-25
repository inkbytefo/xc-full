package readstate

import (
	"time"
)

type ReadState struct {
	ID                string    `json:"id"`
	UserID            string    `json:"user_id"`
	ChannelID         string    `json:"channel_id"`
	LastReadMessageID *string   `json:"last_read_message_id"`
	LastReadAt        time.Time `json:"last_read_at"`
}
