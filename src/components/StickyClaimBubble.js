import './StickyClaimBubble.css'
import { claimGroups } from '../data/claims.js'
import { trackBubbleDropdownOpen, trackBubbleNavJump } from '../analytics.js'

export function StickyClaimBubble(contentPanel) {
  const bubble = document.createElement('div')
  bubble.className = 'claim-bubble'
  bubble.innerHTML = `
    <div class="claim-bubble-header">
      <span class="claim-bubble-num"></span>
      <button class="claim-bubble-arrow" aria-label="주장 목록 열기">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    <span class="claim-bubble-text"></span>
  `
  document.body.appendChild(bubble)

  // Dropdown list
  const dropdown = document.createElement('div')
  dropdown.className = 'claim-dropdown'
  dropdown.innerHTML = claimGroups.map((g, i) => `
    <button class="claim-dropdown-item" data-index="${i}">
      <span class="claim-dropdown-num">${i + 1}</span>
      <span class="claim-dropdown-label">${g.claim.replace(/\n/g, ' ')}</span>
    </button>
  `).join('')
  bubble.appendChild(dropdown)

  const numEl = bubble.querySelector('.claim-bubble-num')
  const textEl = bubble.querySelector('.claim-bubble-text')
  const arrowBtn = bubble.querySelector('.claim-bubble-arrow')
  let dropdownOpen = false

  // Cache card/dialogue pairs for perf
  const pairs = []
  const cards = contentPanel.querySelectorAll('.claim-card')
  cards.forEach((card, i) => {
    const quoteId = card.dataset.quote
    const dialogue = contentPanel.querySelector(`.dialogue-section[data-quote="${quoteId}"]`)
    if (dialogue) {
      pairs.push({ card, dialogue, index: i })
    }
  })

  let currentIndex = -1
  let ticking = false

  function triggerBubbleHighlight() {
    if (currentIndex < 0) return
    textEl.classList.remove('highlight-active')
    void textEl.offsetWidth
    textEl.classList.add('highlight-active')
  }

  // Sync bubble highlight with content span highlights (debounced)
  let highlightDebounce = null
  window.addEventListener('claim-span-activated', () => {
    if (currentIndex < 0) return
    clearTimeout(highlightDebounce)
    highlightDebounce = setTimeout(triggerBubbleHighlight, 100)
  })

  function show(index) {
    if (currentIndex === index) return
    currentIndex = index
    const group = claimGroups[index]
    numEl.textContent = `윤석열의 거짓말 ${index + 1}`
    textEl.innerHTML = `<span class="claim-text-inner">${group.claim.replace(/\n/g, '<br>')}</span>`
    bubble.classList.add('visible')
  }

  function hide() {
    if (currentIndex === -1) return
    currentIndex = -1
    bubble.classList.remove('visible')
  }

  function updatePosition() {
    const rect = contentPanel.getBoundingClientRect()
    bubble.style.left = `${rect.left}px`
    bubble.style.width = `${rect.width}px`
  }

  function update() {
    let activeIndex = -1

    for (const { card, dialogue, index } of pairs) {
      const cardRect = card.getBoundingClientRect()
      const dialogueRect = dialogue.getBoundingClientRect()

      // ClaimCard halfway above viewport AND dialogue still visible
      if (cardRect.bottom < cardRect.height / 2 && dialogueRect.bottom > window.innerHeight * 0.25) {
        activeIndex = index
      }
    }

    if (activeIndex >= 0) {
      show(activeIndex)
    } else {
      hide()
    }

    updatePosition()
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        update()
        ticking = false
      })
      ticking = true
    }
  }

  // Dropdown toggle
  function toggleDropdown(open) {
    dropdownOpen = typeof open === 'boolean' ? open : !dropdownOpen
    bubble.classList.toggle('dropdown-open', dropdownOpen)
    arrowBtn.setAttribute('aria-expanded', dropdownOpen)
    if (dropdownOpen) {
      highlightCurrent()
      trackBubbleDropdownOpen(currentIndex + 1)
    }
  }

  function highlightCurrent() {
    dropdown.querySelectorAll('.claim-dropdown-item').forEach((item, i) => {
      item.classList.toggle('active', i === currentIndex)
    })
  }

  // Jump to section on dropdown item click
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.claim-dropdown-item')
    if (!item) return
    e.stopPropagation()
    const idx = parseInt(item.dataset.index, 10)
    trackBubbleNavJump(currentIndex + 1, idx + 1)
    const target = pairs[idx]?.card
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    toggleDropdown(false)
  })

  // Entire bubble toggles dropdown
  bubble.addEventListener('click', (e) => {
    if (e.target.closest('.claim-dropdown')) return
    e.stopPropagation()
    toggleDropdown()
  })

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (dropdownOpen) toggleDropdown(false)
  })

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => {
    requestAnimationFrame(updatePosition)
  }, { passive: true })

  requestAnimationFrame(update)
}
