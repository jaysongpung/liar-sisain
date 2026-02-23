import './OutroSection.css'
import { outro, footerCredits, footer } from '../data/content.js'

export function OutroSection() {
  const el = document.createElement('footer')
  el.className = 'outro-section'

  el.innerHTML = `
    <div class="outro-body">
      ${outro.map(p => `<p>${p}</p>`).join('')}
      <div class="outlinks__split"><span>시사IN</span><a href="https://subscribe.sisain.co.kr" target="_blank">구독</a>/<a href="https://support.sisain.co.kr/" target="_blank">후원</a></div>
    </div>
    <div class="outro-credits">
      ${footerCredits.writer}<br>
      ${footerCredits.team}<br>
      ${footerCredits.photo}<br>
      ${footerCredits.production}
    </div>
    <div class="outro-divider"></div>
    <div class="outro-legal">
      ${footer.copyright}<br>
      Mail to <a href="mailto:webmaster@sisain.co.kr">webmaster@sisain.co.kr</a>
    </div>
    <div class="outro-studio">${footer.credit}</div>
  `

  return el
}
