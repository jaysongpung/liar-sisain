import './ChatContainer.css'
import { dialogue } from '../data/dialogue.js'
import { people } from '../data/people.js'
import { highlightPerson } from './RelationshipMap.js'
import { getSpacing, SECTION_BOTTOM_SPACING, SECTION_TOP_SPACING } from './spacingRules.js'
import {
  trackClaimEnter, trackSectionMilestone,
  trackPersonRevealed, trackPersonCardClick,
  trackGalleryNavigate, trackGalleryDimToggle, trackImageCircleViewed,
  getClaimNumberFromQuoteId,
} from '../analytics.js'

const profileImageIds = new Set([
  'chojihyo', 'hongjangwon', 'josunghyun', 'jungsungwoo',
  'kimbongsik', 'kimcheoljin', 'kimhyunggi', 'kimhyuntae', 'kimyonghyun',
  'kimyoungkwon', 'kwakjonggeun', 'leejinwoo', 'leesanghyun', 'moonsangho',
  'nosangwon', 'parkansu', 'yeoinhyeong', 'yujaewon',
])
const nameToId = new Map(people.map(p => [p.name, p.id]))

// Shared across all DialogueSection calls — tracks first-appearance red dots
const seenPersons = new Set()

// ── Claim span highlighting (shared across all sections) ──
const allClaimSpans = []
const spanStates = new WeakMap()   // span → 'active' | 'fading' | null
const fadingTimers = new WeakMap() // span → timeout id
let highlightListenerActive = false
const HIGHLIGHT_ENTER = 300  // highlight when span top ≤ this (px from viewport top)
const HIGHLIGHT_EXIT = -50   // remove when span scrolls above this

// ── Person reveal on map (shared across all sections) ──
const allPersonCards = []
// Persistent list for continuous focus tracking (PC highlight on scroll)
const allPersonCardsForFocus = []
let currentFocusedPerson = null

// ── Circle animation wraps (shared, triggered by same scroll threshold) ──
const allCircleWraps = []

// ── Claim section tracking for analytics ──
const allClaimPairs = [] // { card, dialogueEl, claimNumber, claimText }
let activeClaimNum = -1

// ── Hand-drawn circle animation ──
function generateHandDrawnCircle(cx, cy, rx, ry) {
  const k = 0.5522847498 // kappa for cubic bezier circle approximation
  const kx = rx * k
  const ky = ry * k
  const w = Math.min(rx, ry) * 0.04

  // 4 cubic bezier segments forming an imperfect ellipse (clockwise from left)
  return (
    `M ${cx - rx + w * 2},${cy + w} ` +
    `C ${cx - rx - w},${cy - ky - w * 2} ${cx - kx + w * 2},${cy - ry + w} ${cx + w},${cy - ry - w} ` +
    `C ${cx + kx + w * 2},${cy - ry + w * 0.5} ${cx + rx + w},${cy - ky - w} ${cx + rx - w * 0.5},${cy + w} ` +
    `C ${cx + rx + w * 0.5},${cy + ky + w * 2} ${cx + kx - w},${cy + ry + w} ${cx - w},${cy + ry - w * 0.5} ` +
    `C ${cx - kx - w * 2},${cy + ry + w * 0.5} ${cx - rx + w},${cy + ky - w} ${cx - rx + w * 4},${cy - w}`
  )
}

function updateHighlights() {
  for (let i = 0; i < allClaimSpans.length; i++) {
    const span = allClaimSpans[i]
    const distance = span.getBoundingClientRect().top
    const state = spanStates.get(span)
    const inZone = distance <= HIGHLIGHT_ENTER && distance >= HIGHLIGHT_EXIT

    if (inZone && state !== 'active') {
      // Enter active zone
      clearTimeout(fadingTimers.get(span))
      span.classList.remove('span-fading')
      span.classList.add('span-active')
      spanStates.set(span, 'active')
      window.dispatchEvent(new CustomEvent('claim-span-activated'))
    } else if (!inZone && state === 'active') {
      // Leave active zone → start fading
      span.classList.remove('span-active')
      span.classList.add('span-fading')
      spanStates.set(span, 'fading')
      const timer = setTimeout(() => {
        span.classList.remove('span-fading')
        spanStates.set(span, null)
      }, 1000)
      fadingTimers.set(span, timer)
    }
  }

  // Reveal person nodes on map at the same scroll threshold (one-shot un-dim)
  for (let i = allPersonCards.length - 1; i >= 0; i--) {
    const card = allPersonCards[i]
    const distance = card.getBoundingClientRect().top
    if (distance <= HIGHLIGHT_ENTER) {
      const personName = card.dataset.person
      if (personName) {
        const section = card.closest('.dialogue-section')
        trackPersonRevealed(personName, getClaimNumberFromQuoteId(section?.dataset.quote))
        window.dispatchEvent(new CustomEvent('person-revealed', { detail: { personName } }))
      }
      allPersonCards.splice(i, 1)
    }
  }

  // PC: continuously track which person card is in focus and highlight on map
  if (window.innerWidth >= 1024) {
    let topPerson = null
    for (let i = allPersonCardsForFocus.length - 1; i >= 0; i--) {
      const card = allPersonCardsForFocus[i]
      const distance = card.getBoundingClientRect().top
      if (distance <= HIGHLIGHT_ENTER) {
        topPerson = card.dataset.person
        break
      }
    }
    if (topPerson && topPerson !== currentFocusedPerson) {
      currentFocusedPerson = topPerson
      window.dispatchEvent(new CustomEvent('person-focus-changed', { detail: { personName: topPerson } }))
    }
  }

  // Trigger circle draw animations at the same threshold
  for (let i = allCircleWraps.length - 1; i >= 0; i--) {
    const wrap = allCircleWraps[i]
    const distance = wrap.getBoundingClientRect().top
    if (distance <= HIGHLIGHT_ENTER) {
      wrap.querySelectorAll('.hand-drawn-circle').forEach(path => {
        path.style.strokeDashoffset = '0'
      })
      const section = wrap.closest('.dialogue-section')
      trackImageCircleViewed(getClaimNumberFromQuoteId(section?.dataset.quote))
      allCircleWraps.splice(i, 1)
    }
  }

  // ── Claim progression tracking ──
  for (let i = allClaimPairs.length - 1; i >= 0; i--) {
    const { card, dialogueEl, claimNumber, claimText } = allClaimPairs[i]
    const cardRect = card.getBoundingClientRect()
    if (cardRect.bottom < cardRect.height / 2 && dialogueEl) {
      const dRect = dialogueEl.getBoundingClientRect()
      if (dRect.bottom > 0) {
        if (claimNumber !== activeClaimNum) {
          activeClaimNum = claimNumber
          trackClaimEnter(claimNumber, claimText)
        }
        const progress = 1 - (dRect.bottom / dRect.height)
        if (progress >= 0.25) trackSectionMilestone(claimNumber, 25)
        if (progress >= 0.50) trackSectionMilestone(claimNumber, 50)
        if (progress >= 0.75) trackSectionMilestone(claimNumber, 75)
        if (progress >= 1.00) trackSectionMilestone(claimNumber, 100)
        break
      }
    }
  }
}

function setupHighlighting(container) {
  container.querySelectorAll('[class^="claims"]').forEach(span => {
    allClaimSpans.push(span)
  })

  if (!highlightListenerActive) {
    window.addEventListener('scroll', updateHighlights, { passive: true })
    highlightListenerActive = true
  }

  requestAnimationFrame(updateHighlights)
}

function getProfileImage(name) {
  const id = nameToId.get(name)
  if (id && profileImageIds.has(id)) return `images/profile/${id}.jpg`
  return 'images/profile/anonymous.jpg'
}

function openRelationshipMap(personName) {
  highlightPerson(personName)
  window.dispatchEvent(new CustomEvent('open-map-overlay', { detail: { personName } }))
}

export function DialogueSection(quoteId) {
  const items = dialogue.filter(item => item.quote === quoteId)
  if (items.length === 0) return null

  const el = document.createElement('div')
  el.className = 'dialogue-section'
  el.dataset.quote = quoteId
  el.style.paddingTop = `${SECTION_TOP_SPACING}px`
  el.style.paddingBottom = `${SECTION_BOTTOM_SPACING}px`

  el.innerHTML = renderItemsForQuote(items)

  setTimeout(() => setupInteractions(el), 0)

  return el
}

function renderItemsForQuote(items) {
  let html = ''
  let prevType = null

  items.forEach((item) => {
    if (prevType) {
      const px = getSpacing(prevType, item.type)
      html += `<div class="chat-spacer" style="height:${px}px"></div>`
    }

    switch (item.type) {
      case 'person': {
        html += renderPerson(item)
        break
      }
      case 'transcript': html += renderTranscript(item); break
      case 'data': html += renderDataCard(item); break
      case 'calllog': html += renderCallLog(item); break
      case 'image': html += renderImage(item); break
      case 'gallery': html += renderGallery(item); break
    }
    prevType = item.type
  })

  return html
}

function renderPerson(item) {
  const isFirstAppearance = !seenPersons.has(item.name)
  const isVeryFirst = seenPersons.size === 0 && isFirstAppearance
  if (isFirstAppearance) seenPersons.add(item.name)
  const firstPersonAttr = isFirstAppearance ? ' data-first-person="true"' : ''
  const dotHtml = isFirstAppearance ? '<span class="new-person-dot"></span>' : ''
  const tooltipHtml = isVeryFirst ? '<span class="profile-tooltip">눌러서 관계도 보기</span>' : ''
  return `
    <div class="testimony-card" data-id="${item.id}" data-person="${item.name}"${firstPersonAttr}>
      <div class="testimony-source" data-person="${item.name}">
        <div class="testimony-avatar">${dotHtml}<img src="${getProfileImage(item.name)}" alt="${item.name}"></div>${tooltipHtml}
        <div class="testimony-info">
          <span class="testimony-name">${item.name}</span>
          <span class="testimony-role">${item.role}</span>
        </div>
      </div>
      <div class="testimony-body">
        <div class="testimony-content">${item.content}</div>
        ${item.hearing ? `<div class="testimony-hearing">— ${item.hearing}</div>` : ''}
      </div>
    </div>
  `
}

function renderTranscript(item) {
  const sections = []
  let currentRows = []
  let currentSubtitle = null
  for (const line of item.lines) {
    if (line.subtitle) {
      if (currentRows.length) {
        sections.push({ subtitle: currentSubtitle, rows: currentRows })
      }
      currentSubtitle = line.subtitle
      currentRows = []
    } else {
      currentRows.push(line)
    }
  }
  if (currentRows.length) {
    sections.push({ subtitle: currentSubtitle, rows: currentRows })
  }
  const contentHtml = sections.map(s => {
    const sub = s.subtitle ? `<div class="line-subtitle">${s.subtitle}</div>` : ''
    const rows = s.rows.map(line => `
      <tr class="line">
        <td class="speaker-cell"><span class="speaker">${line.speaker}</span></td>
        <td class="text-cell"><span class="line-text">${line.text}</span></td>
      </tr>`).join('')
    return `${sub}<table class="recording-table"><tbody>${rows}</tbody></table>`
  }).join('')

  return `
    <div class="recording-block" data-id="${item.id}">
      <div class="recording-header">
        <span class="recording-label">${item.name || '녹취록'}</span>
      </div>
      <div class="recording-content">
        ${contentHtml}
      </div>
      ${item.hearing ? `<div class="recording-source">— ${item.hearing}</div>` : ''}
    </div>
  `
}

function formatDataContent(text) {
  if (!text) return ''
  return text.split('\n')
    .map(line => line.startsWith('- ') ? line.slice(2) : line)
    .filter(line => line.trim())
    .map(line => `<div class="data-line"><span class="data-bullet"></span><span class="data-text">${line}</span></div>`)
    .join('')
}

function renderDataCard(item) {
  return `
    <div class="data-card" data-id="${item.id}">
      <div class="data-header">
        ${item.title || ''}
      </div>
      <div class="data-content">${formatDataContent(item.content)}</div>
      ${item.hearing ? `<div class="data-card-source">— ${item.hearing}</div>` : ''}
    </div>
  `
}

function renderCallLog(item) {
  const keys = item.columns.length === 3 ? ['num', 'sender', 'time'] : ['num', 'time']

  const rows = item.lines.map(line => {
    if (line.subtitle) {
      return `
        <tr class="line">
          <td class="num-cell"></td>
          <td class="text-cell" colspan="${keys.length - 1}"><span class="line-text">${line.subtitle}</span></td>
        </tr>`
    }
    const cells = keys.map((key, i) => {
      const val = line[key] ?? line.speaker ?? line.text ?? ''
      const cls = i === 0 ? 'num-cell' : 'text-cell'
      const inner = i === 0 ? `<span class="calllog-num">${val}</span>` : `<span class="line-text">${val}</span>`
      return `<td class="${cls}">${inner}</td>`
    }).join('')
    return `<tr class="line">${cells}</tr>`
  }).join('')

  const headers = item.columns.map((col, i) =>
    `<th class="${i === 0 ? 'num-cell' : 'text-cell'}">${col}</th>`
  ).join('')

  return `
    <div class="recording-block calllog-card" data-id="${item.id}">
      <div class="recording-header">
        <span class="recording-label">${item.title || item.name || '녹취록'}</span>
      </div>
      <div class="recording-content">
        <table class="recording-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${item.hearing ? `<div class="recording-source">— ${item.hearing}</div>` : ''}
    </div>
  `
}

function renderImage(item) {
  const srcs = item.sources || [item.src]
  const maxW = item.maxWidth ? `max-width:${item.maxWidth}px` : ''
  const hasCircles = item.circles && item.circles.length > 0 && !item.sources

  const imagesHtml = srcs.map(src => {
    if (hasCircles) {
      const circlesHtml = item.circles.map(c =>
        `<path class="hand-drawn-circle" data-cx="${c.cx}" data-cy="${c.cy}"${c.rx ? ` data-rx="${c.rx}"` : ''}${c.ry ? ` data-ry="${c.ry}"` : ''} fill="none" stroke="var(--red)" stroke-linecap="round" />`
      ).join('')

      return `
        <div class="image-circle-wrap" style="${maxW ? maxW + ';' : ''}margin:0 auto">
          <img class="image-card-img" src="${src}" alt="${item.caption || ''}" />
          <svg class="circle-overlay" xmlns="http://www.w3.org/2000/svg">${circlesHtml}</svg>
        </div>`
    }
    return `<img class="image-card-img" src="${src}" alt="${item.caption || ''}" style="${maxW}" />`
  }).join('')

  return `
    <div class="image-card" data-id="${item.id}">
      ${item.caption ? `<div class="image-card-caption">${item.caption}</div>` : ''}
      ${imagesHtml}
      ${item.hearing ? `<div class="image-card-source">— ${item.hearing}</div>` : ''}
    </div>
  `
}


function renderGallery(item) {
  const maxW = item.maxWidth ? `max-width:${item.maxWidth}px` : ''
  const single = item.slides.length === 1
  const slidesHtml = item.slides.map((slide, i) => `
    <div class="gallery-slide${i === 0 ? ' active' : ''}" data-index="${i}">
      <img class="gallery-img" src="${slide.src}" alt="" style="${maxW}" />
      <img class="gallery-dim" src="${slide.dim}" alt="" style="${maxW}" />
    </div>
  `).join('')

  return `
    <div class="image-card gallery-card" data-id="${item.id}">
      ${item.caption ? `<div class="image-card-caption">${item.caption}</div>` : ''}
      <div class="gallery-viewport" style="${maxW ? `${maxW};margin:0 auto` : ''}">
        <div class="gallery-slides">${slidesHtml}</div>
        <div class="gallery-hint">터치하여 자세히 읽어보세요</div>
        ${single ? '' : `<button class="gallery-nav gallery-prev" aria-label="이전">‹</button>
        <button class="gallery-nav gallery-next" aria-label="다음">›</button>
        <div class="gallery-counter"><span class="gallery-current">1</span> / ${item.slides.length}</div>`}
      </div>
      ${item.hearing ? `<div class="image-card-source">— ${item.hearing}</div>` : ''}
    </div>
  `
}

function setupCircleAnimations(container) {
  container.querySelectorAll('.image-circle-wrap').forEach(wrap => {
    const img = wrap.querySelector('.image-card-img')
    const svg = wrap.querySelector('.circle-overlay')
    if (!img || !svg) return

    function init() {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) return

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)

      // Scale stroke so it's ~2.5 screen pixels regardless of image resolution
      const displayWidth = img.offsetWidth || img.clientWidth || w
      const strokeW = 2.5 * (w / displayWidth)

      svg.querySelectorAll('.hand-drawn-circle').forEach(path => {
        const cx = parseFloat(path.dataset.cx) / 100 * w
        const cy = parseFloat(path.dataset.cy) / 100 * h
        const customRx = path.dataset.rx ? parseFloat(path.dataset.rx) / 100 * w : null
        const customRy = path.dataset.ry ? parseFloat(path.dataset.ry) / 100 * h : null
        const r = Math.min(w, h) * 0.055
        const rx = customRx || r * 1.8
        const ry = customRy || r

        path.setAttribute('d', generateHandDrawnCircle(cx, cy, rx, ry))
        path.setAttribute('stroke-width', strokeW)

        const length = path.getTotalLength()
        path.style.strokeDasharray = length
        path.style.strokeDashoffset = length
      })
    }

    if (img.complete && img.naturalWidth) init()
    else img.addEventListener('load', init)

    allCircleWraps.push(wrap)
  })
}

function setupInteractions(container) {
  // --- Claim span highlighting ---
  setupHighlighting(container)

  // --- Hand-drawn circle animations on images ---
  setupCircleAnimations(container)

  // --- New person red dot observer ---
  const firstPersonCards = container.querySelectorAll('.testimony-card[data-first-person="true"]')

  const personObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const dot = entry.target.querySelector('.new-person-dot')
        if (dot) dot.classList.add('visible')
        personObserver.unobserve(entry.target)
      }
    })
  }, { root: null, threshold: 0.3 })

  firstPersonCards.forEach(card => personObserver.observe(card))

  // --- Collect person cards for scroll-based map reveal ---
  container.querySelectorAll('.testimony-card[data-person]').forEach(card => {
    allPersonCards.push(card)
    allPersonCardsForFocus.push(card)
  })

  // --- Tooltip observer for first person ---
  const firstCard = container.querySelector('.testimony-card[data-first-person="true"]')
  if (firstCard) {
    const tooltipObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const tooltip = entry.target.querySelector('.profile-tooltip')
          if (tooltip) setTimeout(() => tooltip.classList.add('visible'), 800)
          tooltipObserver.unobserve(entry.target)
        }
      })
    }, { root: null, threshold: 0.3 })
    tooltipObserver.observe(firstCard)
  }

  // --- Gallery navigation + tap-to-toggle dim ---
  container.querySelectorAll('.gallery-card').forEach(gallery => {
    const slides = gallery.querySelectorAll('.gallery-slide')
    const counter = gallery.querySelector('.gallery-current')
    const hint = gallery.querySelector('.gallery-hint')
    let current = 0
    let hintDismissed = false

    function goTo(index) {
      slides[current].classList.remove('active')
      current = index
      slides[current].classList.remove('dimmed')
      slides[current].classList.add('active')
      if (counter) counter.textContent = current + 1
    }

    const prevBtn = gallery.querySelector('.gallery-prev')
    const nextBtn = gallery.querySelector('.gallery-next')
    const galleryClaimNum = getClaimNumberFromQuoteId(gallery.closest('.dialogue-section')?.dataset.quote)
    if (prevBtn) prevBtn.addEventListener('click', () => {
      const idx = current > 0 ? current - 1 : slides.length - 1
      goTo(idx)
      trackGalleryNavigate(idx, 'prev', galleryClaimNum)
    })
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const idx = current < slides.length - 1 ? current + 1 : 0
      goTo(idx)
      trackGalleryNavigate(idx, 'next', galleryClaimNum)
    })

    // Tap image to toggle dim overlay
    gallery.querySelector('.gallery-slides').addEventListener('click', () => {
      const slide = slides[current]
      if (!slide) return
      slide.classList.toggle('dimmed')
      trackGalleryDimToggle(current, slide.classList.contains('dimmed') ? 'dim' : 'undim', galleryClaimNum)
      if (hint && !hintDismissed) {
        hintDismissed = true
        hint.classList.add('hidden')
      }
    })
  })

  // --- Register claim pairs for scroll-based analytics ---
  const claimCard = container.previousElementSibling
  if (claimCard && claimCard.classList.contains('claim-card')) {
    const quoteId = claimCard.dataset.quote
    const claimNumber = getClaimNumberFromQuoteId(quoteId)
    const claimText = claimCard.querySelector('.claim-quote')?.textContent || ''
    allClaimPairs.push({ card: claimCard, dialogueEl: container, claimNumber, claimText })
  }

  // --- Person click → dismiss dot + tooltip + open relationship map ---
  container.addEventListener('click', (e) => {
    const source = e.target.closest('.testimony-source')
    if (!source) return
    const personName = source.dataset.person

    const dot = source.querySelector('.new-person-dot')
    if (dot) dot.classList.add('dismissed')

    const tooltip = container.querySelector('.profile-tooltip')
    if (tooltip) tooltip.classList.add('hidden')

    if (personName) {
      const card = source.closest('.testimony-card')
      const role = source.querySelector('.testimony-role')?.textContent || ''
      const claimNum = getClaimNumberFromQuoteId(container.dataset.quote)
      trackPersonCardClick(personName, role, claimNum, !!card?.hasAttribute('data-first-person'))
      openRelationshipMap(personName)
    }
  })
}
