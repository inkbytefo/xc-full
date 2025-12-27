// Package router provides HTTP routing configuration.
package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/requestid"

	"xcord/internal/adapters/http/handlers"
	"xcord/internal/adapters/http/middleware"
)

// Config holds router dependencies.
type Config struct {
	AuthHandler           *handlers.AuthHandler
	UserHandler           *handlers.UserHandler
	ServerHandler         *handlers.ServerHandler
	ServerWallHandler     *handlers.ServerWallHandler
	ChannelHandler        *handlers.ChannelHandler
	ChannelMessageHandler *handlers.ChannelMessageHandler
	FeedHandler           *handlers.FeedHandler
	DMHandler             *handlers.DMHandler
	LiveHandler           *handlers.LiveHandler
	NotificationHandler   *handlers.NotificationHandler
	SearchHandler         *handlers.SearchHandler
	VoiceHandler          *handlers.VoiceHandler
	WebhookHandler        *handlers.WebhookHandler
	MediaHandler          *handlers.MediaHandler
	PrivacyHandler        *handlers.PrivacyHandler
	WebSocketHandler      *handlers.WebSocketHandler
	HealthHandler         *handlers.HealthHandler
	AuthMiddleware        *middleware.AuthMiddleware
	CORSOrigins           []string
	UploadDir             string
}

// Setup configures all routes.
func Setup(app *fiber.App, cfg *Config) {
	// Global middleware
	app.Use(requestid.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     joinOrigins(cfg.CORSOrigins),
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID",
		AllowCredentials: true,
		MaxAge:           86400,
	}))

	// Health endpoints (no auth)
	app.Get("/health", cfg.HealthHandler.Health)
	app.Get("/ready", cfg.HealthHandler.Ready)

	// API v1
	api := app.Group("/api/v1")

	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/register", cfg.AuthHandler.Register)
	auth.Post("/login", cfg.AuthHandler.Login)
	auth.Post("/refresh", cfg.AuthHandler.Refresh)
	auth.Post("/logout", cfg.AuthHandler.Logout)

	// Protected routes
	protected := api.Group("", cfg.AuthMiddleware.Authenticate())
	protected.Get("/me", cfg.UserHandler.GetMe)
	protected.Patch("/me", cfg.UserHandler.UpdateMe)

	// Privacy routes
	if cfg.PrivacyHandler != nil {
		protected.Get("/me/privacy", cfg.PrivacyHandler.GetSettings)
		protected.Patch("/me/privacy", cfg.PrivacyHandler.UpdateSettings)
	}

	// Follow request routes
	protected.Get("/me/follow-requests", cfg.UserHandler.GetPendingRequests)
	protected.Post("/me/follow-requests/:requesterId/accept", cfg.UserHandler.AcceptFollowRequest)
	protected.Post("/me/follow-requests/:requesterId/reject", cfg.UserHandler.RejectFollowRequest)

	// User routes
	users := protected.Group("/users")
	users.Get("/:id", cfg.UserHandler.GetUser)
	users.Post("/:id/follow", cfg.UserHandler.Follow)
	users.Delete("/:id/follow", cfg.UserHandler.Unfollow)
	users.Post("/:id/block", cfg.UserHandler.BlockUser)
	users.Get("/:id/followers", cfg.UserHandler.GetFollowers)
	users.Get("/:id/following", cfg.UserHandler.GetFollowing)
	if cfg.PrivacyHandler != nil {
		users.Get("/:id/can-dm", cfg.PrivacyHandler.CheckDMPermission)
	}

	// Server routes
	servers := protected.Group("/servers")
	servers.Get("", cfg.ServerHandler.List)
	servers.Post("", cfg.ServerHandler.Create)
	servers.Get("/:id", cfg.ServerHandler.Get)
	servers.Patch("/:id", cfg.ServerHandler.Update)
	servers.Delete("/:id", cfg.ServerHandler.Delete)
	servers.Post("/:id/join", cfg.ServerHandler.Join)
	servers.Get("/:id/join-requests", cfg.ServerHandler.ListJoinRequests)
	servers.Post("/:id/join-requests/:userId/accept", cfg.ServerHandler.AcceptJoinRequest)
	servers.Post("/:id/join-requests/:userId/reject", cfg.ServerHandler.RejectJoinRequest)
	servers.Post("/:id/leave", cfg.ServerHandler.Leave)
	servers.Get("/:id/members", cfg.ServerHandler.ListMembers)

	// Moderation routes
	servers.Get("/:id/bans", cfg.ServerHandler.GetBans)
	servers.Post("/:id/bans", cfg.ServerHandler.Ban)
	servers.Delete("/:id/bans/:userId", cfg.ServerHandler.Unban)
	servers.Post("/:id/members/:userId/timeout", cfg.ServerHandler.Timeout)
	servers.Delete("/:id/members/:userId/timeout", cfg.ServerHandler.RemoveTimeout)

	servers.Get("/:id/roles", cfg.ServerHandler.ListRoles)
	servers.Post("/:id/roles", cfg.ServerHandler.CreateRole)
	servers.Patch("/:id/roles/:roleId", cfg.ServerHandler.UpdateRole)
	servers.Delete("/:id/roles/:roleId", cfg.ServerHandler.DeleteRole)
	servers.Put("/:id/members/:userId/roles", cfg.ServerHandler.UpdateMemberRoles)

	// Server wall routes
	servers.Get("/:id/wall", cfg.ServerWallHandler.GetWallPosts)
	servers.Post("/:id/wall", cfg.ServerWallHandler.CreateWallPost)
	servers.Delete("/:id/wall/:postId", cfg.ServerWallHandler.DeleteWallPost)
	servers.Post("/:id/wall/:postId/pin", cfg.ServerWallHandler.PinWallPost)
	servers.Delete("/:id/wall/:postId/pin", cfg.ServerWallHandler.UnpinWallPost)

	// Channel routes
	servers.Get("/:id/channels", cfg.ChannelHandler.List)
	servers.Post("/:id/channels", cfg.ChannelHandler.Create)
	servers.Patch("/:id/channels/reorder", cfg.ChannelHandler.Reorder)
	servers.Patch("/:id/channels/:chId", cfg.ChannelHandler.Update)
	servers.Delete("/:id/channels/:chId", cfg.ChannelHandler.Delete)
	servers.Post("/:id/channels/:chId/ack", cfg.ChannelHandler.Ack)

	// Channel message routes
	servers.Get("/:id/channels/:chId/messages", cfg.ChannelMessageHandler.GetMessages)
	servers.Post("/:id/channels/:chId/messages", cfg.ChannelMessageHandler.SendMessage)
	servers.Get("/:id/channels/:chId/messages/search", cfg.ChannelMessageHandler.SearchMessages)
	servers.Patch("/:id/channels/:chId/messages/:msgId", cfg.ChannelMessageHandler.EditMessage)
	servers.Delete("/:id/channels/:chId/messages/:msgId", cfg.ChannelMessageHandler.DeleteMessage)

	// Feed routes
	protected.Get("/feed", cfg.FeedHandler.GetFeed)

	// Post routes
	posts := protected.Group("/posts")
	posts.Post("", cfg.FeedHandler.CreatePost)
	posts.Get("/:id", cfg.FeedHandler.GetPost)
	posts.Delete("/:id", cfg.FeedHandler.DeletePost)
	posts.Post("/:id/like", cfg.FeedHandler.ToggleLike)
	posts.Post("/:id/repost", cfg.FeedHandler.ToggleRepost)
	posts.Post("/:id/bookmark", cfg.FeedHandler.ToggleBookmark)
	posts.Get("/:id/likes", cfg.FeedHandler.GetLikers)

	// User posts
	protected.Get("/users/:id/posts", cfg.FeedHandler.GetUserPosts)

	// DM routes
	dm := protected.Group("/dm")
	dm.Get("/conversations", cfg.DMHandler.ListConversations)
	dm.Post("/conversations", cfg.DMHandler.StartConversation)
	dm.Get("/conversations/:id", cfg.DMHandler.GetConversation)
	dm.Get("/conversations/:id/messages", cfg.DMHandler.GetMessages)
	dm.Post("/conversations/:id/messages", cfg.DMHandler.SendMessage)
	dm.Post("/conversations/:id/read", cfg.DMHandler.MarkAsRead)
	dm.Patch("/messages/:id", cfg.DMHandler.EditMessage)
	dm.Delete("/messages/:id", cfg.DMHandler.DeleteMessage)

	// Live streaming routes
	live := protected.Group("/live")
	live.Get("/streams", cfg.LiveHandler.GetStreams)
	live.Post("/streams", cfg.LiveHandler.StartStream)
	live.Get("/streams/:id", cfg.LiveHandler.GetStream)
	live.Patch("/streams/:id", cfg.LiveHandler.UpdateStream)
	live.Post("/streams/:id/live", cfg.LiveHandler.GoLive)
	live.Delete("/streams/:id", cfg.LiveHandler.EndStream)
	live.Get("/categories", cfg.LiveHandler.GetCategories)
	live.Get("/categories/:id/streams", cfg.LiveHandler.GetCategoryStreams)

	// Notification routes
	notif := protected.Group("/notifications")
	notif.Get("", cfg.NotificationHandler.GetNotifications)
	notif.Get("/unread/count", cfg.NotificationHandler.GetUnreadCount)
	notif.Post("/read-all", cfg.NotificationHandler.MarkAllAsRead)
	notif.Patch("/:id/read", cfg.NotificationHandler.MarkAsRead)
	notif.Delete("/:id", cfg.NotificationHandler.DeleteNotification)

	// Search routes
	search := protected.Group("/search")
	search.Get("", cfg.SearchHandler.Search)
	search.Get("/users", cfg.SearchHandler.SearchUsers)
	search.Get("/servers", cfg.SearchHandler.SearchServers)
	search.Get("/posts", cfg.SearchHandler.SearchPosts)

	// Voice channel routes
	servers.Get("/:id/voice-channels", cfg.VoiceHandler.GetVoiceChannels)
	servers.Post("/:id/voice-channels", cfg.VoiceHandler.CreateVoiceChannel)

	voiceChannels := protected.Group("/voice-channels")
	voiceChannels.Delete("/:id", cfg.VoiceHandler.DeleteVoiceChannel)
	voiceChannels.Post("/:id/token", cfg.VoiceHandler.GetVoiceToken)
	voiceChannels.Get("/:id/participants", cfg.VoiceHandler.GetChannelParticipants)

	// LiveKit Webhook (public with signature verification)
	api.Post("/webhooks/livekit", cfg.WebhookHandler.Handle)

	// Media routes
	media := protected.Group("/media")
	media.Post("/upload", cfg.MediaHandler.Upload)
	media.Get("", cfg.MediaHandler.List)
	media.Get("/:id", cfg.MediaHandler.Get)
	media.Delete("/:id", cfg.MediaHandler.Delete)

	// Static file serving for uploads
	app.Get("/uploads/*", handlers.ServeUploads(cfg.UploadDir))

	// WebSocket route (uses query param token)
	app.Use("/ws", cfg.WebSocketHandler.Upgrade())
	app.Get("/ws", cfg.AuthMiddleware.AuthenticateWS(), cfg.WebSocketHandler.Handle())

	// 404 handler
	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": fiber.Map{
				"code":    "NOT_FOUND",
				"message": "Resource not found",
			},
		})
	})
}

func joinOrigins(origins []string) string {
	if len(origins) == 0 {
		return "*"
	}
	result := ""
	for i, o := range origins {
		if i > 0 {
			result += ","
		}
		result += o
	}
	return result
}
