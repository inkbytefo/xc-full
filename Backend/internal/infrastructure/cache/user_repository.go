package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"pink/internal/domain/user"

	"github.com/redis/go-redis/v9"
)

// CachedUserRepository implements user.Repository with Redis caching.
type CachedUserRepository struct {
	delegate user.Repository
	redis    *redis.Client
	ttl      time.Duration
}

// NewCachedUserRepository creates a new CachedUserRepository.
func NewCachedUserRepository(delegate user.Repository, redis *redis.Client) *CachedUserRepository {
	return &CachedUserRepository{
		delegate: delegate,
		redis:    redis,
		ttl:      1 * time.Hour,
	}
}

func (r *CachedUserRepository) userKey(id string) string {
	return fmt.Sprintf("user:%s", id)
}

// FindByID finds a user by their ID, checking cache first.
func (r *CachedUserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
	key := r.userKey(id)

	// Try cache
	val, err := r.redis.Get(ctx, key).Result()
	if err == nil {
		var u user.User
		if err := json.Unmarshal([]byte(val), &u); err == nil {
			return &u, nil
		}
	} else if err != redis.Nil {
		// Log error but continue to DB
		fmt.Printf("Redis error in FindByID: %v\n", err)
	}

	// Cache miss or error, fetch from DB
	u, err := r.delegate.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Set cache
	data, err := json.Marshal(u)
	if err == nil {
		r.redis.Set(ctx, key, data, r.ttl)
	}

	return u, nil
}

// Update updates an existing user and validates cache.
func (r *CachedUserRepository) Update(ctx context.Context, u *user.User) error {
	if err := r.delegate.Update(ctx, u); err != nil {
		return err
	}
	return r.redis.Del(ctx, r.userKey(u.ID)).Err()
}

// Delete deletes a user and invalidates cache.
func (r *CachedUserRepository) Delete(ctx context.Context, id string) error {
	if err := r.delegate.Delete(ctx, id); err != nil {
		return err
	}
	return r.redis.Del(ctx, r.userKey(id)).Err()
}

// UpdateLastSeen updates last seen and invalidates cache.
func (r *CachedUserRepository) UpdateLastSeen(ctx context.Context, id string) error {
	// We might want to NOT invalidate cache on every LastSeen update to prevent cache thrashing,
	// but strictly speaking, the object changed.
	// Optimization: Don't invalidate, let TTL expire, or just update the field in Redis if possible.
	// For now, let's just invalidate to ensure consistency.
	if err := r.delegate.UpdateLastSeen(ctx, id); err != nil {
		return err
	}
	return r.redis.Del(ctx, r.userKey(id)).Err()
}

// Delegate other methods directly
func (r *CachedUserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	return r.delegate.FindByEmail(ctx, email)
}

func (r *CachedUserRepository) FindByHandle(ctx context.Context, handle string) (*user.User, error) {
	return r.delegate.FindByHandle(ctx, handle)
}

func (r *CachedUserRepository) Create(ctx context.Context, u *user.User) error {
	return r.delegate.Create(ctx, u)
}
