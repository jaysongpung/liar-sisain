import './colors.css'
import './style.css'
import { RelationshipMap } from './components/RelationshipMap.js'
import { trackMapOverlayOpen, trackMapOverlayClose, trackArticleComplete, initSessionTracking } from './analytics.js'


const isEditor = new URLSearchParams(window.location.search).has('editor')
const app = document.getElementById('app')

if (isEditor) {
  // Editor mode: fullscreen map only
  app.style.width = '100vw'
  app.style.height = '100vh'
  app.appendChild(RelationshipMap())
} else {
  // Normal mode: two-column layout
  const { IntroSection } = await import('./components/IntroSection.js')
  const { ClaimCard } = await import('./components/ClaimCard.js')
  const { DialogueSection } = await import('./components/ChatContainer.js')
  const { OutroSection } = await import('./components/OutroSection.js')
  const { StickyClaimBubble } = await import('./components/StickyClaimBubble.js')
  const { claimGroups } = await import('./data/claims.js')

  const layout = document.createElement('div')
  layout.className = 'layout'

  const mapPanel = document.createElement('aside')
  mapPanel.className = 'layout-map'

  const mapEl = RelationshipMap()
  mapPanel.appendChild(mapEl)

  // Close button for mobile overlay
  const closeBtn = document.createElement('button')
  closeBtn.className = 'map-overlay-close'
  closeBtn.setAttribute('aria-label', '관계도 닫기')
  closeBtn.textContent = '✕'
  mapPanel.appendChild(closeBtn)

  function closeOverlay(method) {
    mapPanel.classList.remove('overlay-active')
    trackMapOverlayClose(method || 'button')
  }

  closeBtn.addEventListener('click', closeOverlay)

  // Open map overlay / pan to person when profile is clicked
  let pendingModalTimer = null
  window.addEventListener('open-map-overlay', (e) => {
    const personName = e.detail?.personName
    trackMapOverlayOpen(personName)
    if (pendingModalTimer) clearTimeout(pendingModalTimer)

    if (window.innerWidth >= 1024) {
      // PC: pan to person, then open modal after 1s
      if (personName) {
        if (mapEl.revealPerson) mapEl.revealPerson(personName)
        pendingModalTimer = setTimeout(() => {
          if (mapEl.openPersonModal) mapEl.openPersonModal(personName)
        }, 1000)
      }
      return
    }

    // Mobile: open overlay, center on person, show bottom sheet immediately
    mapPanel.classList.add('overlay-active')
    requestAnimationFrame(() => {
      if (mapEl.remeasure) mapEl.remeasure()

      if (personName) {
        if (mapEl.revealPerson) mapEl.revealPerson(personName)
        if (mapEl.centerOnPerson) mapEl.centerOnPerson(personName)
        if (mapEl.openBottomSheet) mapEl.openBottomSheet(personName)
      } else if (mapEl.fitToViewport) {
        mapEl.fitToViewport()
      }
    })
  })

  // Close overlay on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mapPanel.classList.contains('overlay-active')) {
      closeOverlay('escape')
    }
  })

  // Reveal person nodes on the map as user scrolls through dialogue
  window.addEventListener('person-revealed', (e) => {
    const personName = e.detail?.personName
    if (personName && mapEl.revealPerson) {
      mapEl.revealPerson(personName)
    }
  })

  // PC: highlight + pan to person as scroll focus changes
  window.addEventListener('person-focus-changed', (e) => {
    const personName = e.detail?.personName
    if (personName && mapEl.focusPerson) {
      mapEl.focusPerson(personName)
    }
  })

  const contentPanel = document.createElement('main')
  contentPanel.className = 'layout-content'

  contentPanel.appendChild(IntroSection())

  claimGroups.forEach((group, i) => {
    contentPanel.appendChild(ClaimCard(group, i + 1))
    const dialogueEl = DialogueSection(group.id)
    if (dialogueEl) contentPanel.appendChild(dialogueEl)
  })

  contentPanel.appendChild(OutroSection())

  layout.appendChild(mapPanel)
  layout.appendChild(contentPanel)
  app.appendChild(layout)

  StickyClaimBubble(contentPanel)

  // Article complete tracking
  const outroEl = contentPanel.querySelector('.outro-section')
  if (outroEl) {
    const outroObs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        trackArticleComplete()
        outroObs.disconnect()
      }
    }, { threshold: 0.5 })
    outroObs.observe(outroEl)
  }

  initSessionTracking()
}
