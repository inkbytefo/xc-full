package text

import (
	"regexp"
	"strings"
)

var hashtagRegex = regexp.MustCompile(`#(\w+)`)

// ExtractHashtags extracts unique hashtags from content.
// It returns a slice of unique tags (without the # symbol).
// Max 5 tags are returned.
func ExtractHashtags(content string) []string {
	matches := hashtagRegex.FindAllStringSubmatch(content, -1)
	if len(matches) == 0 {
		return nil
	}

	uniqueTags := make(map[string]struct{})
	var tags []string

	for _, match := range matches {
		if len(match) > 1 {
			tag := strings.ToLower(match[1])
			if _, exists := uniqueTags[tag]; !exists {
				uniqueTags[tag] = struct{}{}
				tags = append(tags, tag)
				if len(tags) >= 5 {
					break
				}
			}
		}
	}

	return tags
}
