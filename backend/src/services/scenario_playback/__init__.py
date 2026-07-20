"""Demo Scenario Playback Engine for SafeFusion AI.

Replays a timed JSON scenario (``backend/demo_scenarios/*.json``) into the
live database, one row at a time, driving the same production Compound
Risk / Emergency Response / Compliance / Alert Generation rule chain the
real API endpoints use — so the dashboard's existing 10-second polling
picks up the unfolding incident with no frontend changes.
"""
