// Package post defines the Post domain entity and related types.
package post

import (
	"errors"
	"time"
)

// Domain errors
var (
	ErrNotFound         = errors.New("post not found")
	ErrNoPermission     = errors.New("no permission")
	ErrInvalidContent   = errors.New("invalid content")
	ErrServerIDRequired = errors.New("server_id required for server visibility")
)

// Visibility represents the visibility of a post.
type Visibility string

const (
	VisibilityPublic  Visibility = "public"
	VisibilityFriends Visibility = "friends"
	VisibilityServer  Visibility = "server"
)

// IsValid checks if the visibility is valid.
func (v Visibility) IsValid() bool {
	switch v {
	case VisibilityPublic, VisibilityFriends, VisibilityServer:
		return true
	}
	return false
}

// Post represents a post entity in the domain.
type Post struct {
	ID          string
	AuthorID    string
	Content     string
	Visibility  Visibility
	ServerID    *string // Optional, only for server posts
	ReplyToID   *string // Optional, for replies
	RepostOfID  *string // Optional, for reposts
	MediaURLs   []string
	LikeCount   int
	RepostCount int
	ReplyCount  int
	CreatedAt   time.Time
	UpdatedAt   time.Time

	// Joined fields (not stored directly)
	Author       *PostAuthor
	IsLiked      bool
	IsReposted   bool
	IsBookmarked bool
}

// PostAuthor represents the author info joined with a post.
type PostAuthor struct {
	ID             string
	Handle         string
	DisplayName    string
	AvatarGradient [2]string
	IsVerified     bool
}

// Reaction represents a user reaction to a post.
type Reaction struct {
	ID        string
	PostID    string
	UserID    string
	Type      ReactionType
	CreatedAt time.Time
}

// ReactionType represents the type of reaction.
type ReactionType string

const (
	ReactionLike     ReactionType = "like"
	ReactionRepost   ReactionType = "repost"
	ReactionBookmark ReactionType = "bookmark"
)

// IsValid checks if the reaction type is valid.
func (r ReactionType) IsValid() bool {
	switch r {
	case ReactionLike, ReactionRepost, ReactionBookmark:
		return true
	}
	return false
}

// FeedFilter represents feed query filters.
type FeedFilter struct {
	Visibility Visibility
	AuthorID   string
	ServerID   string
	Cursor     string
	Limit      int
}
