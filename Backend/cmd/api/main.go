// Package main is the entrypoint for the XCORD API server.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"xcord/internal/adapters/http/handlers"
	"xcord/internal/adapters/http/middleware"
	"xcord/internal/adapters/http/router"
	channelApp "xcord/internal/application/channel"
	dmApp "xcord/internal/application/dm"
	feedApp "xcord/internal/application/feed"
	privacyApp "xcord/internal/application/privacy"
	serverApp "xcord/internal/application/server"
	userApp "xcord/internal/application/user"
	"xcord/internal/config"
	"xcord/internal/domain/user"
	"xcord/internal/infrastructure/auth"
	"xcord/internal/infrastructure/cache"
	"xcord/internal/infrastructure/livekit"
	"xcord/internal/infrastructure/postgres"
	wsInfra "xcord/internal/infrastructure/ws"
)

func main() {
	// Initialize logger
	logger := setupLogger()
	slog.SetDefault(logger)

	logger.Info("Starting XCORD API Server")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Error("Failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	logger.Info("Configuration loaded",
		slog.String("env", cfg.Env),
		slog.String("port", cfg.HTTP.Port),
	)

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to PostgreSQL
	logger.Info("Connecting to PostgreSQL...")
	dbPool, err := postgres.NewPool(ctx, &cfg.DB)
	if err != nil {
		logger.Error("Failed to connect to PostgreSQL", slog.Any("error", err))
		os.Exit(1)
	}
	defer dbPool.Close()
	logger.Info("PostgreSQL connected")

	// Connect to Redis
	logger.Info("Connecting to Redis...")
	redisClient, err := connectRedis(cfg.Redis.URL)
	if err != nil {
		logger.Warn("Failed to connect to Redis, running without cache", slog.Any("error", err))
		redisClient = nil
	} else {
		defer redisClient.Close()
		logger.Info("Redis connected")
	}

	// Initialize infrastructure
	passwordHasher := auth.NewPasswordHasher()

	jwtService, err := auth.NewJWTService(&cfg.JWT)
	if err != nil {
		logger.Error("Failed to initialize JWT service", slog.Any("error", err))
		os.Exit(1)
	}
	logger.Info("JWT service initialized")

	// Initialize repositories
	var userRepo user.Repository = postgres.NewUserRepository(dbPool)
	if redisClient != nil {
		userRepo = cache.NewCachedUserRepository(userRepo, redisClient)
		logger.Info("User repository caching enabled")
	}

	sessionRepo := postgres.NewSessionRepository(dbPool)

	followRepo := postgres.NewFollowRepository(dbPool)
	serverRepo := postgres.NewServerRepository(dbPool)
	memberRepo := postgres.NewMemberRepository(dbPool)
	roleRepo := postgres.NewRoleRepository(dbPool)
	joinRequestRepo := postgres.NewJoinRequestRepository(dbPool)
	channelRepo := postgres.NewChannelRepository(dbPool)
	postRepo := postgres.NewPostRepository(dbPool)
	reactionRepo := postgres.NewReactionRepository(dbPool)
	convRepo := postgres.NewConversationRepository(dbPool)
	dmMessageRepo := postgres.NewDMMessageRepository(dbPool)
	wallPostRepo := postgres.NewWallPostRepository(dbPool)

	// Initialize services
	privacyRepo := postgres.NewPrivacyRepository(dbPool)
	readStateRepo := postgres.NewReadStateRepository(dbPool)
	userService := userApp.NewService(userRepo, sessionRepo, followRepo, privacyRepo, passwordHasher, jwtService)
	serverService := serverApp.NewService(serverRepo, memberRepo, roleRepo, channelRepo, joinRequestRepo)
	channelService := channelApp.NewService(channelRepo, memberRepo, serverRepo, readStateRepo)
	feedService := feedApp.NewService(postRepo, reactionRepo)
	dmService := dmApp.NewService(convRepo, dmMessageRepo)

	// Initialize privacy service
	privacyService := privacyApp.NewService(privacyRepo, followRepo)

	// Initialize WebSocket hub
	wsHub := wsInfra.NewHub()
	go wsHub.Run()
	logger.Info("WebSocket hub started")

	wsHandler := handlers.NewWebSocketHandler(wsHub)

	// Initialize channel message repository
	channelMessageRepo := postgres.NewChannelMessageRepository(dbPool)

	// Initialize live streaming repositories
	streamRepo := postgres.NewStreamRepository(dbPool)
	categoryRepo := postgres.NewCategoryRepository(dbPool)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService)
	userHandler := handlers.NewUserHandler(userService)
	serverHandler := handlers.NewServerHandler(serverService, userRepo)
	serverWallHandler := handlers.NewServerWallHandler(wallPostRepo, memberRepo, serverRepo)
	channelHandler := handlers.NewChannelHandler(channelService)
	channelMessageHandler := handlers.NewChannelMessageHandler(channelMessageRepo, channelRepo, memberRepo, serverRepo, wsHandler)
	feedHandler := handlers.NewFeedHandler(feedService)
	dmHandler := handlers.NewDMHandler(dmService, wsHub, userRepo)
	liveHandler := handlers.NewLiveHandler(streamRepo, categoryRepo)
	notificationRepo := postgres.NewNotificationRepository(dbPool)
	notificationHandler := handlers.NewNotificationHandler(notificationRepo)
	searchRepo := postgres.NewSearchRepository(dbPool)
	searchHandler := handlers.NewSearchHandler(searchRepo)
	voiceChannelRepo := postgres.NewVoiceChannelRepository(dbPool)
	voiceParticipantRepo := postgres.NewVoiceParticipantRepository(dbPool)

	// Initialize LiveKit service if configured
	var livekitService *livekit.Service
	livekitHost := os.Getenv("LIVEKIT_HOST")
	livekitAPIKey := os.Getenv("LIVEKIT_API_KEY")
	livekitAPISecret := os.Getenv("LIVEKIT_API_SECRET")
	if livekitHost != "" && livekitAPIKey != "" && livekitAPISecret != "" {
		var err error
		livekitService, err = livekit.NewService(livekit.Config{
			Host:      livekitHost,
			APIKey:    livekitAPIKey,
			APISecret: livekitAPISecret,
		})
		if err != nil {
			logger.Warn("Failed to initialize LiveKit service, voice features will be unavailable", slog.Any("error", err))
		} else {
			logger.Info("LiveKit service initialized", slog.String("host", livekitHost))
		}
	} else {
		logger.Warn("LiveKit not configured, voice features will be unavailable")
	}

	voiceHandler := handlers.NewVoiceHandler(voiceChannelRepo, memberRepo, serverRepo, userRepo, livekitService)
	webhookHandler := handlers.NewWebhookHandler(voiceParticipantRepo, livekitAPIKey, livekitAPISecret)
	mediaRepo := postgres.NewMediaRepository(dbPool)
	uploadDir := "./uploads"
	baseURL := "http://localhost:" + cfg.HTTP.Port
	mediaHandler := handlers.NewMediaHandler(mediaRepo, uploadDir, baseURL)
	privacyHandler := handlers.NewPrivacyHandler(privacyService)
	healthHandler := handlers.NewHealthHandler(dbPool, redisClient)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(userService)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:       "XCORD API",
		ServerHeader:  "XCORD",
		ReadTimeout:   cfg.HTTP.ReadTimeout,
		WriteTimeout:  cfg.HTTP.WriteTimeout,
		IdleTimeout:   cfg.HTTP.IdleTimeout,
		StrictRouting: true,
		CaseSensitive: true,
		ErrorHandler:  errorHandler,
	})

	// Add global middleware
	app.Use(middleware.Recovery(logger))
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORS(cfg.CORS.AllowedOrigins))
	app.Use(middleware.RateLimiter(middleware.RateLimiterConfig{
		Redis:     redisClient,
		Max:       100,
		Window:    time.Minute,
		KeyPrefix: "xcord:ratelimit",
		SkipPaths: []string{"/health", "/ready"},
	}))
	app.Use(middleware.RequestLogger(logger))

	// Setup routes
	router.Setup(app, &router.Config{
		AuthHandler:           authHandler,
		UserHandler:           userHandler,
		ServerHandler:         serverHandler,
		ServerWallHandler:     serverWallHandler,
		ChannelHandler:        channelHandler,
		ChannelMessageHandler: channelMessageHandler,
		FeedHandler:           feedHandler,
		DMHandler:             dmHandler,
		LiveHandler:           liveHandler,
		NotificationHandler:   notificationHandler,
		SearchHandler:         searchHandler,
		VoiceHandler:          voiceHandler,
		WebhookHandler:        webhookHandler,
		MediaHandler:          mediaHandler,
		PrivacyHandler:        privacyHandler,
		WebSocketHandler:      wsHandler,
		HealthHandler:         healthHandler,
		AuthMiddleware:        authMiddleware,
		CORSOrigins:           cfg.CORS.AllowedOrigins,
		UploadDir:             uploadDir,
	})

	// Start server
	go func() {
		addr := fmt.Sprintf(":%s", cfg.HTTP.Port)
		logger.Info("Server starting", slog.String("addr", addr))
		if err := app.Listen(addr); err != nil {
			logger.Error("Server error", slog.Any("error", err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		logger.Error("Server forced to shutdown", slog.Any("error", err))
	}

	logger.Info("Server stopped")
}

func setupLogger() *slog.Logger {
	var handler slog.Handler

	logLevel := os.Getenv("LOG_LEVEL")
	level := slog.LevelInfo
	switch logLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}

	logFormat := os.Getenv("LOG_FORMAT")
	opts := &slog.HandlerOptions{
		Level:     level,
		AddSource: level == slog.LevelDebug,
	}

	if logFormat == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}

func connectRedis(url string) (*redis.Client, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := client.Ping(ctx).Result(); err != nil {
		return nil, err
	}

	return client, nil
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"error": fiber.Map{
			"code":    "ERROR",
			"message": err.Error(),
		},
	})
}
