import './IntroSection.css'
import { title, intro, credits, guide } from '../data/content.js'

export function IntroSection() {
  const el = document.createElement('section')
  el.className = 'intro-section'

  el.innerHTML = `
    <div class="intro-hero">
      <img src="images/main.jpg" alt="" />
      <div class="intro-hero-overlay"></div>
      <h1 class="intro-title">${title.main}</h1>
    </div>
    <div class="intro-body">
      ${intro.map(p => `<p>${p}</p>`).join('')}
    </div>
    <div class="intro-credits">
      ${credits.writer}<br>
      ${credits.team}
    </div>
    <div class="intro-judge-icon">
      <img src="images/judgement.svg" alt="재판 아이콘" />
    </div>
    <div class="intro-guide">${guide}</div>
  `

  // Scroll indicator (ATF) — scoped to .layout-content panel
  const scrollHint = document.createElement('div')
  scrollHint.className = 'scroll-hint-atf'
  scrollHint.innerHTML = `
    <div class="scroll-hint-atf-bg"></div>
    <svg class="scroll-hint-atf-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7"/>
    </svg>
  `
  document.body.appendChild(scrollHint)

  function positionHint() {
    const panel = document.querySelector('.layout-content')
    if (panel) {
      const rect = panel.getBoundingClientRect()
      scrollHint.style.left = `${rect.left}px`
      scrollHint.style.width = `${rect.width}px`
    }
  }

  let dismissed = false
  function onScroll() {
    if (dismissed) return
    if (window.scrollY >= 200) {
      dismissed = true
      scrollHint.classList.add('hidden')
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', positionHint)
    }
  }

  requestAnimationFrame(positionHint)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', positionHint, { passive: true })

  return el
}
