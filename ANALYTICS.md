# v12 Analytics Event Reference

GA4 Property: `G-DHE8T8Z88J`
Implementation: `src/analytics.js`

---

## Auto-tracked by GA4 (do not duplicate)

| Event | What it covers |
|---|---|
| `page_view` | Page load |
| `session_start` | New session |
| `first_visit` | First-time visitor |
| `scroll` | 90% page scroll |
| `user_engagement` | Session duration (`engagement_time_msec`) |

---

## Custom Events (20)

### Content Progression

| Event | Trigger | Params | Insight |
|---|---|---|---|
| `claim_enter` | Claim card scrolls past midpoint | `claim_number` (1-10), `claim_text` | Drop-off funnel: where readers stop |
| `claim_exit` | Next claim enters or article ends | `claim_number`, `dwell_time_sec` | Time spent per claim section |
| `section_milestone` | 25/50/75/100% of dialogue section scrolled | `claim_number`, `percent` | Shallow vs deep reading per claim |
| `article_complete` | Outro section enters viewport | `total_time_sec` | Completion rate |

### Map Interactions

| Event | Trigger | Params | Insight |
|---|---|---|---|
| `map_node_click` | Click person node on SVG map | `person_name`, `person_role`, `device` | Which people interest users most |
| `map_zoom` | Zoom via button/wheel/pinch (debounced 2s) | `direction`, `method`, `zoom_level` | Map engagement depth |
| `map_pan` | Drag gesture ends (>50px threshold) | `drag_distance_px` | Map exploration |
| `map_overlay_open` | Mobile map overlay opens | `person_name` | Mobile map usage |
| `map_overlay_close` | Overlay dismissed | `method` (button/escape) | How users dismiss overlay |

### Person Engagement

| Event | Trigger | Params | Insight |
|---|---|---|---|
| `person_card_click` | Click person card in content area | `person_name`, `person_role`, `claim_number`, `is_first_appearance` | Which testimony sources users explore |
| `person_modal_open` | Desktop person detail modal opens | `person_name` | Desktop person detail engagement |
| `person_bottomsheet_open` | Mobile bottom sheet opens | `person_name` | Mobile person detail engagement |
| `person_revealed` | Person node un-dims on scroll | `person_name`, `claim_number`, `reveal_order` | Reading path / discovery order |

### Navigation

| Event | Trigger | Params | Insight |
|---|---|---|---|
| `bubble_dropdown_open` | Sticky bubble dropdown opens | `current_claim` | Navigation usage frequency |
| `bubble_nav_jump` | Jump to different claim via dropdown | `from_claim`, `to_claim` | Skip/backtrack patterns |

### Content Details

| Event | Trigger | Params | Insight |
|---|---|---|---|
| `gallery_navigate` | Gallery prev/next click | `slide_index`, `direction`, `claim_number` | Gallery interaction depth |
| `gallery_dim_toggle` | Tap gallery image to toggle detail | `slide_index`, `action` (dim/undim), `claim_number` | Detailed image viewing |
| `image_circle_viewed` | Circle annotation animates on scroll | `claim_number` | Scroll depth to annotated evidence |

### Session Quality

| Event | Trigger | Params | Insight |
|---|---|---|---|
| `reading_pace` | Every 60s interval | `time_on_page_sec`, `deepest_claim`, `scroll_percent` | Reading speed over time |
| `idle_return` | User returns after tab switch (>5s) | `idle_duration_sec`, `current_claim` | Tab-switch / return behavior |

---

## GA4 Custom Dimensions to Register

Go to **GA4 Admin > Custom definitions > Create custom dimension** and add:

| Parameter | Scope | Description |
|---|---|---|
| `claim_number` | Event | Claim section (1-10) |
| `claim_text` | Event | Claim text (truncated 50 chars) |
| `person_name` | Event | Person interacted with |
| `person_role` | Event | Person's role/title |
| `dwell_time_sec` | Event | Seconds in a claim section |
| `percent` | Event | Section scroll milestone % |
| `device` | Event | mobile / desktop |
| `direction` | Event | Zoom or nav direction |
| `method` | Event | How action was triggered |
| `reveal_order` | Event | Sequential discovery order |
| `from_claim` | Event | Jump navigation source |
| `to_claim` | Event | Jump navigation destination |
| `total_time_sec` | Event | Total time to complete article |
| `scroll_percent` | Event | Overall page scroll % |
| `deepest_claim` | Event | Furthest claim reached |
| `idle_duration_sec` | Event | Seconds away from tab |

---

## Key Reports to Build in GA4 Explore

### 1. Drop-off Funnel
- **Type**: Funnel exploration
- **Steps**: `claim_enter` with claim_number 1 through 10
- **Shows**: Where readers abandon the article

### 2. Engagement per Claim
- **Type**: Free-form exploration
- **Rows**: `claim_number`
- **Values**: Average `dwell_time_sec` from `claim_exit`, count of `section_milestone` at each %
- **Shows**: Which claims hold attention longest

### 3. Person Popularity
- **Type**: Free-form exploration
- **Rows**: `person_name`
- **Values**: Count of `person_card_click` + `map_node_click`
- **Shows**: Most/least clicked people

### 4. Mobile vs Desktop
- **Type**: Free-form exploration
- **Segment**: `device` = mobile vs desktop
- **Compare**: `map_node_click`, `person_card_click`, `article_complete` rates
- **Shows**: Platform engagement differences

### 5. Reading Pace Timeline
- **Type**: Free-form exploration
- **Rows**: `time_on_page_sec` (bucketed)
- **Values**: Average `deepest_claim`, average `scroll_percent`
- **Shows**: How reading progresses over time

### 6. Navigation Patterns
- **Type**: Free-form exploration
- **Rows**: `from_claim`, `to_claim` from `bubble_nav_jump`
- **Shows**: Whether users skip ahead, go back, or read linearly

---

## Debug / Verify

1. Install [GA Debugger](https://chrome.google.com/webstore/detail/ga-debugger) Chrome extension
2. Open GA4 > Admin > DebugView
3. Browse the page — events appear in real-time
4. Editor mode (`?editor` URL param) produces zero analytics calls
