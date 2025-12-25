package notification

import "context"

// Repository defines the interface for notification data access.
type Repository interface {
	// FindByID finds a notification by its ID.
	FindByID(ctx context.Context, id string) (*Notification, error)

	// FindByUserID finds notifications for a user with pagination.
	FindByUserID(ctx context.Context, userID string, cursor string, limit int) ([]*Notification, string, error)

	// GetUnreadCount gets the unread notification count for a user.
	GetUnreadCount(ctx context.Context, userID string) (int, error)

	// Create creates a new notification.
	Create(ctx context.Context, notification *Notification) error

	// MarkAsRead marks a notification as read.
	MarkAsRead(ctx context.Context, id string) error

	// MarkAllAsRead marks all notifications as read for a user.
	MarkAllAsRead(ctx context.Context, userID string) error

	// Delete deletes a notification.
	Delete(ctx context.Context, id string) error

	// DeleteOldNotifications deletes notifications older than the given duration.
	DeleteOldNotifications(ctx context.Context, userID string, olderThan int) error
}

// PreferencesRepository defines the interface for notification preferences data access.
type PreferencesRepository interface {
	// FindByUserID finds preferences for a user.
	FindByUserID(ctx context.Context, userID string) (*NotificationPreferences, error)

	// Upsert creates or updates preferences.
	Upsert(ctx context.Context, prefs *NotificationPreferences) error
}
