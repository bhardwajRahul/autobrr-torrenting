// Copyright (c) 2021 - 2023, Ludvig Lundgren and the autobrr contributors.
// SPDX-License-Identifier: GPL-2.0-or-later

package notification

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/autobrr/autobrr/internal/domain"
	"github.com/autobrr/autobrr/pkg/errors"

	"github.com/rs/zerolog"
)

type pushoverMessage struct {
	Token     string    `json:"api_key"`
	User      string    `json:"token"`
	Message   string    `json:"message"`
	Priority  int32     `json:"priority"`
	Title     string    `json:"title"`
	Timestamp time.Time `json:"timestamp"`
	Html      int       `json:"html,omitempty"`
}

type pushoverSender struct {
	log      zerolog.Logger
	Settings domain.Notification
	baseUrl  string
	builder  NotificationBuilderPlainText
}

func NewPushoverSender(log zerolog.Logger, settings domain.Notification) domain.NotificationSender {
	return &pushoverSender{
		log:      log.With().Str("sender", "pushover").Logger(),
		Settings: settings,
		baseUrl:  "https://api.pushover.net/1/messages.json",
	}
}

func (s *pushoverSender) Send(event domain.NotificationEvent, payload domain.NotificationPayload) error {

	title := s.builder.BuildTitle(event)
	message := s.builder.BuildBody(payload)

	m := pushoverMessage{
		Token:     s.Settings.APIKey,
		User:      s.Settings.Token,
		Priority:  s.Settings.Priority,
		Message:   message,
		Title:     title,
		Timestamp: time.Now(),
		Html:      1,
	}

	data := url.Values{}
	data.Set("token", m.Token)
	data.Set("user", m.User)
	data.Set("message", m.Message)
	data.Set("priority", strconv.Itoa(int(m.Priority)))
	data.Set("title", m.Title)
	data.Set("timestamp", fmt.Sprintf("%v", m.Timestamp.Unix()))
	data.Set("html", fmt.Sprintf("%v", m.Html))

	if m.Priority == 2 {
		data.Set("expire", "3600")
		data.Set("retry", "60")
	}

	req, err := http.NewRequest(http.MethodPost, s.baseUrl, strings.NewReader(data.Encode()))
	if err != nil {
		s.log.Error().Err(err).Msgf("pushover client request error: %v", event)
		return errors.Wrap(err, "could not create request")
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "autobrr")

	client := http.Client{Timeout: 30 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		s.log.Error().Err(err).Msgf("pushover client request error: %v", event)
		return errors.Wrap(err, "could not make request: %+v", req)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		s.log.Error().Err(err).Msgf("pushover client request error: %v", event)
		return errors.Wrap(err, "could not read data")
	}

	defer res.Body.Close()

	s.log.Trace().Msgf("pushover status: %v response: %v", res.StatusCode, string(body))

	if res.StatusCode != http.StatusOK {
		s.log.Error().Err(err).Msgf("pushover client request error: %v", string(body))
		return errors.New("bad status: %v body: %v", res.StatusCode, string(body))
	}

	s.log.Debug().Msg("notification successfully sent to pushover")

	return nil
}

func (s *pushoverSender) CanSend(event domain.NotificationEvent) bool {
	if s.isEnabled() && s.isEnabledEvent(event) {
		return true
	}
	return false
}

func (s *pushoverSender) isEnabled() bool {
	if s.Settings.Enabled {
		if s.Settings.APIKey == "" {
			s.log.Warn().Msg("pushover missing api key")
			return false
		}

		if s.Settings.Token == "" {
			s.log.Warn().Msg("pushover missing user key")
			return false
		}

		return true
	}

	return false
}

func (s *pushoverSender) isEnabledEvent(event domain.NotificationEvent) bool {
	for _, e := range s.Settings.Events {
		if e == string(event) {
			return true
		}
	}

	return false
}
