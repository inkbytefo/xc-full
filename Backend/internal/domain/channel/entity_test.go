package channel

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// =============================================================================
// ChannelType Tests
// =============================================================================

func TestChannelType_IsValid(t *testing.T) {
	tests := []struct {
		name     string
		chanType ChannelType
		expected bool
	}{
		{"text is valid", TypeText, true},
		{"announcement is valid", TypeAnnouncement, true},
		{"category is valid", TypeCategory, true},
		{"hybrid is valid", TypeHybrid, true},
		{"empty is invalid", ChannelType(""), false},
		{"unknown is invalid", ChannelType("unknown"), false},
		{"voice-only is invalid", ChannelType("voice"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.chanType.IsValid())
		})
	}
}

func TestChannelType_IsCategory(t *testing.T) {
	tests := []struct {
		chanType ChannelType
		expected bool
	}{
		{TypeText, false},
		{TypeAnnouncement, false},
		{TypeCategory, true},
		{TypeHybrid, false},
	}

	for _, tt := range tests {
		t.Run(string(tt.chanType), func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.chanType.IsCategory())
		})
	}
}

func TestChannelType_IsVoiceEnabled(t *testing.T) {
	tests := []struct {
		chanType ChannelType
		expected bool
	}{
		{TypeText, false},
		{TypeAnnouncement, false},
		{TypeCategory, false},
		{TypeHybrid, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.chanType), func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.chanType.IsVoiceEnabled())
		})
	}
}

func TestChannelType_IsTextEnabled(t *testing.T) {
	tests := []struct {
		chanType ChannelType
		expected bool
	}{
		{TypeText, true},
		{TypeAnnouncement, true},
		{TypeCategory, false},
		{TypeHybrid, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.chanType), func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.chanType.IsTextEnabled())
		})
	}
}
