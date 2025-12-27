package voice

import "context"

// ChannelRepository defines the interface for voice channel data access.
type ChannelRepository interface {
	// FindByID finds a voice channel by its ID.
	FindByID(ctx context.Context, id string) (*VoiceChannel, error)

	// FindByServerID finds all voice channels in a server.
	FindByServerID(ctx context.Context, serverID string) ([]*VoiceChannel, error)

	// Create creates a new voice channel.
	Create(ctx context.Context, channel *VoiceChannel) error

	// Update updates a voice channel.
	Update(ctx context.Context, channel *VoiceChannel) error

	// Delete deletes a voice channel.
	Delete(ctx context.Context, id string) error

	// UpdatePosition updates channel positions.
	UpdatePosition(ctx context.Context, id string, position int) error
}

// ParticipantRepository defines the interface for participant data access.
type ParticipantRepository interface {
	// FindByChannelID finds all participants in a voice channel.
	FindByChannelID(ctx context.Context, channelID string) ([]*Participant, error)

	// FindByUserID finds what channel a user is in.
	FindByUserID(ctx context.Context, userID string) (*Participant, error)

	// Join adds a user to a voice channel.
	Join(ctx context.Context, participant *Participant) error

	// Leave removes a user from a voice channel.
	Leave(ctx context.Context, userID string) error

	// UpdateState updates participant state (muted, deafened, etc.)
	UpdateState(ctx context.Context, userID string, isMuted, isDeafened, isVideoOn bool) error

	// GetChannelParticipantCount gets the number of participants in a channel.
	GetChannelParticipantCount(ctx context.Context, channelID string) (int, error)

	// DeleteByChannelID deletes all participants in a channel.
	DeleteByChannelID(ctx context.Context, channelID string) error

	// FindByServerID finds all participants in a server (requires join).
	FindByServerID(ctx context.Context, serverID string) ([]*Participant, error)
}
