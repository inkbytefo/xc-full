// Package feed provides feed-related application services.
package feed

import (
	"context"
	"time"

	"pink/internal/domain/post"
	"pink/internal/pkg/id"
)

// Service provides feed-related operations.
type Service struct {
	postRepo     post.Repository
	reactionRepo post.ReactionRepository
}

// NewService creates a new feed service.
func NewService(
	postRepo post.Repository,
	reactionRepo post.ReactionRepository,
) *Service {
	return &Service{
		postRepo:     postRepo,
		reactionRepo: reactionRepo,
	}
}

// CreatePostCommand represents a post creation request.
type CreatePostCommand struct {
	AuthorID   string
	Content    string
	Visibility post.Visibility
	ServerID   *string
	ReplyToID  *string
	MediaURLs  []string
}

// CreatePost creates a new post.
func (s *Service) CreatePost(ctx context.Context, cmd CreatePostCommand) (*post.Post, error) {
	if len(cmd.Content) == 0 || len(cmd.Content) > 1000 {
		return nil, post.ErrInvalidContent
	}

	if !cmd.Visibility.IsValid() {
		cmd.Visibility = post.VisibilityPublic
	}

	// Validate: server visibility requires serverId
	if cmd.Visibility == post.VisibilityServer && (cmd.ServerID == nil || *cmd.ServerID == "") {
		return nil, post.ErrServerIDRequired
	}

	now := time.Now()
	p := &post.Post{
		ID:          id.Generate("post"),
		AuthorID:    cmd.AuthorID,
		Content:     cmd.Content,
		Visibility:  cmd.Visibility,
		ServerID:    cmd.ServerID,
		ReplyToID:   cmd.ReplyToID,
		MediaURLs:   cmd.MediaURLs,
		LikeCount:   0,
		RepostCount: 0,
		ReplyCount:  0,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.postRepo.Create(ctx, p); err != nil {
		return nil, err
	}

	// Increment reply count if this is a reply
	if cmd.ReplyToID != nil {
		_ = s.postRepo.IncrementCount(ctx, *cmd.ReplyToID, "reply_count", 1)
	}

	return p, nil
}

// GetPost retrieves a post by ID.
func (s *Service) GetPost(ctx context.Context, id, userID string) (*post.Post, error) {
	p, err := s.postRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Enrich with user reactions
	reactions, err := s.reactionRepo.GetUserReactions(ctx, userID, []string{p.ID})
	if err == nil {
		for _, r := range reactions[p.ID] {
			switch r {
			case post.ReactionLike:
				p.IsLiked = true
			case post.ReactionRepost:
				p.IsReposted = true
			case post.ReactionBookmark:
				p.IsBookmarked = true
			}
		}
	}

	return p, nil
}

// DeletePost deletes a post.
func (s *Service) DeletePost(ctx context.Context, id, userID string) error {
	p, err := s.postRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if p.AuthorID != userID {
		return post.ErrNoPermission
	}

	return s.postRepo.Delete(ctx, id)
}

// GetFeed retrieves the feed for a user.
func (s *Service) GetFeed(ctx context.Context, userID string, cursor string, limit int) ([]*post.Post, string, error) {
	filter := post.FeedFilter{
		Visibility: post.VisibilityPublic,
		Cursor:     cursor,
		Limit:      limit,
	}

	posts, nextCursor, err := s.postRepo.FindFeed(ctx, userID, filter)
	if err != nil {
		return nil, "", err
	}

	// Enrich with user reactions
	if len(posts) > 0 {
		postIDs := make([]string, len(posts))
		for i, p := range posts {
			postIDs[i] = p.ID
		}

		reactions, err := s.reactionRepo.GetUserReactions(ctx, userID, postIDs)
		if err == nil {
			for _, p := range posts {
				for _, r := range reactions[p.ID] {
					switch r {
					case post.ReactionLike:
						p.IsLiked = true
					case post.ReactionRepost:
						p.IsReposted = true
					case post.ReactionBookmark:
						p.IsBookmarked = true
					}
				}
			}
		}
	}

	return posts, nextCursor, nil
}

// GetUserPosts retrieves posts by a user.
func (s *Service) GetUserPosts(ctx context.Context, authorID, viewerID, cursor string, limit int) ([]*post.Post, string, error) {
	posts, nextCursor, err := s.postRepo.FindByAuthorID(ctx, authorID, cursor, limit)
	if err != nil {
		return nil, "", err
	}

	// Enrich with viewer reactions
	if len(posts) > 0 && viewerID != "" {
		postIDs := make([]string, len(posts))
		for i, p := range posts {
			postIDs[i] = p.ID
		}

		reactions, err := s.reactionRepo.GetUserReactions(ctx, viewerID, postIDs)
		if err == nil {
			for _, p := range posts {
				for _, r := range reactions[p.ID] {
					switch r {
					case post.ReactionLike:
						p.IsLiked = true
					case post.ReactionRepost:
						p.IsReposted = true
					case post.ReactionBookmark:
						p.IsBookmarked = true
					}
				}
			}
		}
	}

	return posts, nextCursor, nil
}

// ToggleReaction toggles a reaction on a post.
func (s *Service) ToggleReaction(ctx context.Context, postID, userID string, reactionType post.ReactionType) (bool, error) {
	// Verify post exists
	if _, err := s.postRepo.FindByID(ctx, postID); err != nil {
		return false, err
	}

	exists, err := s.reactionRepo.Exists(ctx, postID, userID, reactionType)
	if err != nil {
		return false, err
	}

	if exists {
		// Remove reaction
		if err := s.reactionRepo.Delete(ctx, postID, userID, reactionType); err != nil {
			return false, err
		}
		// Decrement count
		field := getCountField(reactionType)
		if field != "" {
			_ = s.postRepo.IncrementCount(ctx, postID, field, -1)
		}
		return false, nil
	}

	// Add reaction
	reaction := &post.Reaction{
		ID:        id.Generate("reac"),
		PostID:    postID,
		UserID:    userID,
		Type:      reactionType,
		CreatedAt: time.Now(),
	}

	if err := s.reactionRepo.Create(ctx, reaction); err != nil {
		return false, err
	}

	// Increment count
	field := getCountField(reactionType)
	if field != "" {
		_ = s.postRepo.IncrementCount(ctx, postID, field, 1)
	}

	return true, nil
}

// GetPostLikers retrieves users who liked a post.
func (s *Service) GetPostLikers(ctx context.Context, postID, cursor string, limit int) ([]*post.Reaction, string, error) {
	return s.reactionRepo.FindByPostID(ctx, postID, post.ReactionLike, cursor, limit)
}

func getCountField(reactionType post.ReactionType) string {
	switch reactionType {
	case post.ReactionLike:
		return "like_count"
	case post.ReactionRepost:
		return "repost_count"
	default:
		return ""
	}
}
