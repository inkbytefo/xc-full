package ome

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client is a client for the OvenMediaEngine API.
type Client struct {
	baseURL     string
	accessToken string
	httpClient  *http.Client
}

// NewClient creates a new OME API client.
// accessToken is usually "base64(server:password)" if basic auth is used by OME,
// or the access token configured in Server.xml.
func NewClient(url, accessToken string) *Client {
	if url == "" {
		url = "http://localhost:3334"
	}
	return &Client{
		baseURL:     url,
		accessToken: accessToken,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// StreamStats represents statistics for a stream.
type StreamStats struct {
	Name        string `json:"name"`
	InputBytes  int64  `json:"inputBytes"`
	OutputBytes int64  `json:"outputBytes"`
	Sequence    int64  `json:"sequence"`
	CreatedTime string `json:"createdTime"`
	Status      string `json:"status"`
	// Additional standard fields might be nested or different based on version
	// but usually OME returns simple list for streams
}

// Response structure for streams list
type StreamsResponse struct {
	StatusCode int      `json:"statusCode"`
	Message    string   `json:"message"`
	Response   []string `json:"response"` // List of stream names
}

// Detailed stream info might require fetching specific stream
// But for viewer count, we need "OutputProfiles" or "Sessions" info?
// OME API structure for /v1/vhosts/default/apps/app/streams/{stream}
// Response:
// {
//    "input": {...},
//    "outputs": [...],
//    "totalConnections": 123
// }

type StreamDetails struct {
	TotalConnections int `json:"totalConnections"`
}

type StreamDetailsResponse struct {
	StatusCode int           `json:"statusCode"`
	Message    string        `json:"message"`
	Response   StreamDetails `json:"response"`
}

// GetStreams returns a list of active stream names.
func (c *Client) GetStreamNames(vhost, app string) ([]string, error) {
	url := fmt.Sprintf("%s/v1/vhosts/%s/apps/%s/streams", c.baseURL, vhost, app)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	c.setAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OME API error: status %d", resp.StatusCode)
	}

	var result StreamsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Response, nil
}

// GetStreamDetails returns details for a specific stream.
func (c *Client) GetStreamDetails(vhost, app, stream string) (*StreamDetails, error) {
	url := fmt.Sprintf("%s/v1/vhosts/%s/apps/%s/streams/%s", c.baseURL, vhost, app, stream)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	c.setAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OME API error: status %d", resp.StatusCode)
	}

	var result StreamDetailsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result.Response, nil
}

func (c *Client) setAuth(req *http.Request) {
	if c.accessToken != "" {
		req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.accessToken)))
	}
}
