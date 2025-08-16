# Pakstream

PakStream.com is a personal hobby project built as a hands-on experiment in applying AI to software development.
It serves as a sandbox for practicing and refining AI-assisted coding techniques, with lessons learned to be carried into future projects.

## Media Hub

A single `MediaHub` component now powers the `/livetv.html`, `/freepress.html`, `/radio.html` and `/creators.html` routes. Each page loads the shared JavaScript and initializes it with a default mode.

### URL parameters
- `m`: mode (`tv`, `freepress`, `radio`, `creators`)
- `c`: channel key
- `v`: optional YouTube video id

Example: `/live-tv?m=tv&c=GeoNews`

### Data
All streams are described in `all_streams.json`. Each item includes:
- `key`, `name`, `type`
- `media.logo_url` or `media.thumbnail_url`
- `ids.youtube_channel_id` for video channels
- `endpoints` array with stream URLs

To add a new channel, append an item to `all_streams.json` with the fields above.
