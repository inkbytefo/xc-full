package channel

import "context"

// Repository defines the interface for channel data access.
type Repository interface {
	// FindByID finds a channel by its ID.
	FindByID(ctx context.Context, id string) (*Channel, error)

	// FindByServerID finds all channels in a server.
	FindByServerID(ctx context.Context, serverID string) ([]*Channel, error)

	// FindCategories finds all category channels in a server.
	FindCategories(ctx context.Context, serverID string) ([]*Channel, error)

	// Create creates a new channel.
	Create(ctx context.Context, channel *Channel) error

	// Update updates an existing channel.
	Update(ctx context.Context, channel *Channel) error

	// Delete deletes a channel by its ID.
	Delete(ctx context.Context, id string) error

	// ReorderChannels updates channel positions.
	ReorderChannels(ctx context.Context, serverID string, positions map[string]int) error
}

// MessageRepository defines the interface for channel message data access.
type MessageRepository interface {
	// FindByID finds a message by its ID.
	FindByID(ctx context.Context, id string) (*ChannelMessage, error)

	// FindByChannelID finds messages in a channel with pagination.
	FindByChannelID(ctx context.Context, channelID string, cursor string, limit int) ([]*ChannelMessage, string, error)

	// Create creates a new message.
	Create(ctx context.Context, message *ChannelMessage) error

	// Update updates a message.
	Update(ctx context.Context, message *ChannelMessage) error

	// Delete deletes a message by its ID.
	Delete(ctx context.Context, id string) error

	// Search searches messages in a channel.
	Search(ctx context.Context, channelID, query string, limit int) ([]*ChannelMessage, error)
}

// OverwriteRepository defines the interface for permission overwrite data access.
type OverwriteRepository interface {
	// FindByChannelID finds all overwrites for a channel.
	FindByChannelID(ctx context.Context, channelID string) ([]PermissionOverwrite, error)

	// FindByChannelIDs finds overwrites for multiple channels (batch).
	FindByChannelIDs(ctx context.Context, channelIDs []string) (map[string][]PermissionOverwrite, error)

	// Create creates a new overwrite.
	Create(ctx context.Context, overwrite *PermissionOverwrite) error

	// Update updates an existing overwrite.
	Update(ctx context.Context, overwrite *PermissionOverwrite) error

	// Delete deletes an overwrite by its ID.
	Delete(ctx context.Context, id string) error

	// DeleteByChannelAndTarget deletes an overwrite by channel/target combination.
	DeleteByChannelAndTarget(ctx context.Context, channelID string, targetType OverwriteTargetType, targetID string) error
}
