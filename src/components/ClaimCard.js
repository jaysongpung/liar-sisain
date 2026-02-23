import './ClaimCard.css'

export function ClaimCard(group, index) {
  const el = document.createElement('div')
  el.className = 'claim-card'
  el.dataset.quote = group.id

  el.innerHTML = `
    <div class="claim-number">윤석열의 거짓말 ${index}</div>
    <div class="claim-quote">\u201C${group.quote}\u201D</div>
    <div class="claim-source">— ${group.source}</div>
    <div class="claim-scroll-hint">
      <span>아래로 내려 직접 판단해보세요</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7"/>
      </svg>
    </div>
  `

  return el
}
