// analytics.js — GA4 custom event tracking for v12
const IS_EDITOR = new URLSearchParams(window.location.search).has('editor')

function track(name, params = {}) {
  if (IS_EDITOR || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

// ── Internal state ──
let currentClaim = 0
let deepestClaim = 0
let revealCounter = 0
const claimEnterTs = new Map()
const sectionHit = new Map() // claim → Set of milestone %s already fired
let zoomTimer = null
let lastZoomParams = null

// ── Content progression ──

export function trackClaimEnter(claimNumber, claimText) {
  // Fire exit for previous claim first
  if (currentClaim > 0 && currentClaim !== claimNumber) {
    fireClaimExit(currentClaim)
  }
  currentClaim = claimNumber
  if (claimNumber > deepestClaim) deepestClaim = claimNumber
  if (claimEnterTs.has(claimNumber)) return // already entered
  claimEnterTs.set(claimNumber, Date.now())
  track('claim_enter', {
    claim_number: claimNumber,
    claim_text: claimText.slice(0, 50),
  })
}

function fireClaimExit(claimNumber) {
  const ts = claimEnterTs.get(claimNumber)
  if (!ts) return
  track('claim_exit', {
    claim_number: claimNumber,
    dwell_time_sec: Math.round((Date.now() - ts) / 1000),
  })
}

export function trackSectionMilestone(claimNumber, percent) {
  if (!sectionHit.has(claimNumber)) sectionHit.set(claimNumber, new Set())
  const hit = sectionHit.get(claimNumber)
  if (hit.has(percent)) return
  hit.add(percent)
  track('section_milestone', { claim_number: claimNumber, percent })
}

export function trackArticleComplete() {
  if (currentClaim > 0) fireClaimExit(currentClaim)
  const total = Math.round((Date.now() - performance.timeOrigin) / 1000)
  track('article_complete', { total_time_sec: total })
}

// ── Map interactions ──

export function trackMapNodeClick(personName, personRole) {
  track('map_node_click', {
    person_name: personName,
    person_role: personRole,
    device: window.innerWidth >= 1024 ? 'desktop' : 'mobile',
  })
}

export function trackMapZoom(direction, method, zoomLevel) {
  lastZoomParams = { direction, method, zoom_level: Math.round(zoomLevel * 100) }
  clearTimeout(zoomTimer)
  zoomTimer = setTimeout(() => {
    if (lastZoomParams) track('map_zoom', lastZoomParams)
    lastZoomParams = null
  }, 2000)
}

export function trackMapPan(distance) {
  if (distance < 50) return
  track('map_pan', { drag_distance_px: Math.round(distance) })
}

export function trackMapOverlayOpen(personName) {
  track('map_overlay_open', { person_name: personName || '' })
}

export function trackMapOverlayClose(method) {
  track('map_overlay_close', { method })
}

// ── Person engagement ──

export function trackPersonCardClick(personName, personRole, claimNumber, isFirstAppearance) {
  track('person_card_click', {
    person_name: personName,
    person_role: personRole,
    claim_number: claimNumber,
    is_first_appearance: isFirstAppearance,
  })
}

export function trackPersonModalOpen(personName) {
  track('person_modal_open', { person_name: personName })
}

export function trackPersonBottomSheetOpen(personName) {
  track('person_bottomsheet_open', { person_name: personName })
}

export function trackPersonRevealed(personName, claimNumber) {
  revealCounter++
  track('person_revealed', {
    person_name: personName,
    claim_number: claimNumber,
    reveal_order: revealCounter,
  })
}

// ── Navigation ──

export function trackBubbleDropdownOpen(currentClaimNum) {
  track('bubble_dropdown_open', { current_claim: currentClaimNum })
}

export function trackBubbleNavJump(fromClaim, toClaim) {
  track('bubble_nav_jump', { from_claim: fromClaim, to_claim: toClaim })
}

// ── Content details ──

export function trackGalleryNavigate(slideIndex, direction, claimNumber) {
  track('gallery_navigate', { slide_index: slideIndex, direction, claim_number: claimNumber })
}

export function trackGalleryDimToggle(slideIndex, action, claimNumber) {
  track('gallery_dim_toggle', { slide_index: slideIndex, action, claim_number: claimNumber })
}

export function trackImageCircleViewed(claimNumber) {
  track('image_circle_viewed', { claim_number: claimNumber })
}

// ── Session quality ──

export function initSessionTracking() {
  if (IS_EDITOR) return

  // Reading pace snapshot every 60s
  setInterval(() => {
    const elapsed = Math.round((Date.now() - performance.timeOrigin) / 1000)
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const scrollPct = maxScroll > 0 ? Math.round((window.scrollY / maxScroll) * 100) : 0
    track('reading_pace', {
      time_on_page_sec: elapsed,
      deepest_claim: deepestClaim,
      scroll_percent: scrollPct,
    })
  }, 60000)

  // Idle return detection
  let hiddenAt = null
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now()
    } else if (hiddenAt) {
      const idle = Math.round((Date.now() - hiddenAt) / 1000)
      if (idle >= 5) {
        track('idle_return', {
          idle_duration_sec: idle,
          current_claim: currentClaim,
        })
      }
      hiddenAt = null
    }
  })
}

// ── Helpers ──

export function getClaimNumberFromQuoteId(quoteId) {
  if (!quoteId) return 0
  return parseInt(quoteId.replace('quote', ''), 10) || 0
}
