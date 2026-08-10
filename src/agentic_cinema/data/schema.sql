CREATE DATABASE IF NOT EXISTS agentic_cinema;

CREATE TABLE IF NOT EXISTS agentic_cinema.viewing_events
(
    user_id         UInt64,
    session_id      String,
    content_id      LowCardinality(String),
    episode_id      UInt8,
    event_type      LowCardinality(String), -- play | pause | seek | drop_off | complete
    position_seconds UInt32,
    device          LowCardinality(String), -- mobile | tv | tablet | desktop
    region          LowCardinality(String),
    event_ts        DateTime
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_ts)
ORDER BY (content_id, episode_id, event_ts);
