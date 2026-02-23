import './RelationshipMap.css'
import { people } from '../data/people.js'
import { mapState as staticMapState } from '../data/mapState.js'
import { trackMapNodeClick, trackMapZoom, trackMapPan, trackPersonModalOpen, trackPersonBottomSheetOpen } from '../analytics.js'

const NODE_HEIGHT = 80

// Build lookup maps
const peopleById = new Map(people.map(p => [p.id, p]))
const posById = new Map(staticMapState.positions.map(p => [p.id, p]))

// Build revealWith lookup: when person X is revealed, also reveal these linked people
const revealWithMap = new Map()
for (const p of people) {
  if (p.revealWith) {
    if (!revealWithMap.has(p.revealWith)) revealWithMap.set(p.revealWith, [])
    revealWithMap.get(p.revealWith).push(p.id)
  }
}

const profileImageIds = new Set([
  'chojihyo', 'hongjangwon', 'josunghyun', 'jungsungwoo',
  'kimbongsik', 'kimcheoljin', 'kimhyunggi', 'kimhyuntae', 'kimyonghyun',
  'kimyoungkwon', 'kwakjonggeun', 'leehyunil', 'leejinwoo', 'leesanghyun', 'moonsangho',
  'nosangwon', 'parkansu', 'yeoinhyeong', 'yoonseokyeol', 'yujaewon',
])

function getProfileImage(id) {
  if (profileImageIds.has(id)) return `images/profile/${id}.jpg`
  return 'images/profile/anonymous.jpg'
}

function buildEdges() {
  const edges = []
  for (const person of people) {
    if (person.reportsTo && posById.has(person.id) && posById.has(person.reportsTo)) {
      edges.push({ from: person.reportsTo, to: person.id })
    }
  }
  return edges
}

function getCanvasBounds() {
  const positions = staticMapState.positions
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of positions) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const pad = 80
  return {
    x: minX - pad,
    y: minY - pad,
    w: (maxX - minX) + pad * 2,
    h: (maxY - minY) + pad * 2 + NODE_HEIGHT,
  }
}

// --- Edge path helper ---
const edgeCurved = staticMapState.styles.edgeCurved !== false

function edgePath(fp, tp, curved) {
  const x1 = fp.x
  const y1 = fp.y + (fp.measuredH || NODE_HEIGHT)
  const x2 = tp.x
  const y2 = tp.y
  if (!curved) return `M${x1} ${y1} L${x2} ${y2}`
  const midY = (y1 + y2) / 2
  return `M${x1} ${y1} C${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
}

function redrawAllEdges(edgeLines, livePos) {
  for (const { path, fromId, toId } of edgeLines) {
    const fp = livePos.get(fromId)
    const tp = livePos.get(toId)
    if (fp && tp) path.setAttribute('d', edgePath(fp, tp, edgeCurved))
  }
}

export function RelationshipMap() {
  const el = document.createElement('div')
  el.className = 'relationship-map'
  el.id = 'relationshipMap'

  const edges = buildEdges()
  const bounds = getCanvasBounds()

  // Track which persons have been revealed by scrolling
  const revealedPersonIds = new Set()

  // Position state (keyed by id)
  const livePos = new Map()
  for (const p of staticMapState.positions) {
    livePos.set(p.id, {
      x: p.x,
      y: p.y,
      measuredH: p.measuredH,
    })
  }

  // Inner canvas with fixed coordinate system
  const canvas = document.createElement('div')
  canvas.className = 'map-canvas'
  canvas.style.width = `${bounds.w}px`
  canvas.style.height = `${bounds.h}px`

  // SVG for edges
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.classList.add('map-edges')
  svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`)
  svg.setAttribute('width', bounds.w)
  svg.setAttribute('height', bounds.h)

  // Gradient for highlighted edges
  const defs = document.createElementNS(svgNS, 'defs')
  const activeGrad = document.createElementNS(svgNS, 'linearGradient')
  activeGrad.id = 'edge-active-grad'
  activeGrad.setAttribute('gradientUnits', 'userSpaceOnUse')
  const stop0 = document.createElementNS(svgNS, 'stop')
  stop0.setAttribute('offset', '0%')
  stop0.setAttribute('stop-color', 'var(--gray-800)')
  const stop1 = document.createElementNS(svgNS, 'stop')
  stop1.setAttribute('offset', '100%')
  stop1.setAttribute('stop-color', 'var(--red)')
  activeGrad.appendChild(stop0)
  activeGrad.appendChild(stop1)
  defs.appendChild(activeGrad)
  svg.appendChild(defs)

  let activeEdgePath = null

  function highlightEdge(personId) {
    // Revert previous
    if (activeEdgePath) {
      activeEdgePath.style.stroke = ''
      activeEdgePath = null
    }
    if (!personId) return
    // Find the edge where this person is the child (toId)
    const entry = edgeLines.find(e => e.toId === personId)
    if (!entry) return
    // Update gradient coordinates to match the edge endpoints
    const fp = livePos.get(entry.fromId)
    const tp = livePos.get(entry.toId)
    if (!fp || !tp) return
    activeGrad.setAttribute('x1', fp.x)
    activeGrad.setAttribute('y1', fp.y + (fp.measuredH || NODE_HEIGHT))
    activeGrad.setAttribute('x2', tp.x)
    activeGrad.setAttribute('y2', tp.y)
    entry.path.style.stroke = 'url(#edge-active-grad)'
    activeEdgePath = entry.path
  }

  // Store SVG line refs for live update
  const edgeLines = []

  for (const edge of edges) {
    const fp = livePos.get(edge.from) || posById.get(edge.from)
    const tp = livePos.get(edge.to) || posById.get(edge.to)
    if (!fp || !tp) continue

    const path = document.createElementNS(svgNS, 'path')
    path.setAttribute('d', edgePath(fp, tp, edgeCurved))
    path.setAttribute('fill', 'none')
    path.classList.add('dimmed')
    svg.appendChild(path)
    edgeLines.push({ path, fromId: edge.from, toId: edge.to })
  }

  canvas.appendChild(svg)

  // Store node element refs
  const nodeEls = new Map()

  // Nodes at positions
  for (const p of staticMapState.positions) {
    const person = peopleById.get(p.id)
    if (!person) continue

    const pos = livePos.get(p.id)
    const node = document.createElement('div')
    node.className = 'map-node dimmed'
    node.dataset.personId = p.id
    node.style.left = `${pos.x - bounds.x}px`
    node.style.top = `${pos.y - bounds.y}px`

    node.innerHTML = `
      <img class="map-node-avatar" src="${getProfileImage(p.id)}" alt="${person.name}" draggable="false" />
      <div class="map-node-text">
        <span class="map-node-name">${person.name}</span>
        <span class="map-node-role">${person.role}</span>
      </div>
    `

    node.addEventListener('click', (e) => {
      if (dragDist > 5) return
      e.stopPropagation()
      if (el.classList.contains('editor-mode')) return
      // Highlight clicked node and its report edge
      restoreClickUndimmed()
      nodeEls.forEach(n => n.classList.remove('active'))
      node.classList.add('active')
      // Temporarily un-dim if not yet scroll-revealed
      if (!revealedPersonIds.has(p.id)) {
        node.classList.remove('dimmed')
        clickUndimmedId = p.id
      }
      highlightEdge(p.id)
      trackMapNodeClick(person.name, person.role)
      if (window.innerWidth < 1024) {
        openBottomSheet(p.id)
      } else {
        openPersonModal(p.id)
      }
    })

    canvas.appendChild(node)
    nodeEls.set(p.id, node)
  }

  // --- Person detail modal ---
  const modal = document.createElement('div')
  modal.className = 'person-modal-backdrop'
  modal.innerHTML = `
    <div class="person-modal">
      <button class="person-modal-close" aria-label="닫기">✕</button>
      <img class="person-modal-avatar" src="" alt="" />
      <div class="person-modal-name"></div>
      <div class="person-modal-role"></div>
      <div class="person-modal-bio"></div>
    </div>
  `
  modal.addEventListener('click', (e) => {
    e.stopPropagation()
    if (e.target === modal) modal.classList.remove('open')
  })
  modal.querySelector('.person-modal-close').addEventListener('click', (e) => {
    e.stopPropagation()
    modal.classList.remove('open')
  })

  function openPersonModal(personId) {
    const person = peopleById.get(personId)
    if (!person) return
    modal.querySelector('.person-modal-avatar').src = getProfileImage(personId)
    modal.querySelector('.person-modal-avatar').alt = person.name
    modal.querySelector('.person-modal-name').textContent = person.name
    modal.querySelector('.person-modal-role').textContent = person.role
    modal.querySelector('.person-modal-bio').textContent = person.bio
    modal.classList.add('open')
    trackPersonModalOpen(person.name)
  }

  // --- Mobile bottom sheet ---
  const bottomSheet = document.createElement('div')
  bottomSheet.className = 'map-bottom-sheet'
  bottomSheet.innerHTML = `
    <div class="map-bottom-sheet-name"></div>
    <div class="map-bottom-sheet-role"></div>
    <div class="map-bottom-sheet-bio"></div>
  `

  function openBottomSheet(personId) {
    const person = peopleById.get(personId)
    if (!person) return
    bottomSheet.querySelector('.map-bottom-sheet-name').textContent = person.name
    bottomSheet.querySelector('.map-bottom-sheet-role').textContent = person.role
    bottomSheet.querySelector('.map-bottom-sheet-bio').textContent = person.bio
    bottomSheet.classList.add('open')
    trackPersonBottomSheetOpen(person.name)
  }

  function closeBottomSheet() {
    bottomSheet.classList.remove('open')
  }

  // Track node temporarily un-dimmed by click (re-dim on dismiss)
  let clickUndimmedId = null
  function restoreClickUndimmed() {
    if (clickUndimmedId) {
      const n = nodeEls.get(clickUndimmedId)
      if (n && !revealedPersonIds.has(clickUndimmedId)) n.classList.add('dimmed')
      clickUndimmedId = null
    }
  }

  // Track drag distance to distinguish clicks from pans
  let dragDist = 0

  el.appendChild(canvas)
  el.appendChild(modal)
  el.appendChild(bottomSheet)

  // --- Pan & Zoom ---
  let scale = 1
  let panX = 0
  let panY = 0
  let isDragging = false
  let startX = 0
  let startY = 0

  // --- Zoom bar ---
  const zoomBar = document.createElement('div')
  zoomBar.className = 'map-zoom-bar'
  const minusBtn = document.createElement('button')
  minusBtn.textContent = '−'
  minusBtn.className = 'map-zoom-btn'
  const pct = document.createElement('span')
  pct.className = 'map-zoom-pct'
  pct.textContent = '100%'
  const plusBtn = document.createElement('button')
  plusBtn.textContent = '+'
  plusBtn.className = 'map-zoom-btn'
  zoomBar.appendChild(minusBtn)
  zoomBar.appendChild(pct)
  zoomBar.appendChild(plusBtn)
  el.appendChild(zoomBar)

  function zoomByStep(factor) {
    const rect = el.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const prevScale = scale
    let newScale = scale * factor
    // Snap to 100% when crossing it
    if ((prevScale < 1 && newScale > 1) || (prevScale > 1 && newScale < 1)) {
      newScale = 1
    }
    scale = Math.min(Math.max(newScale, 0.2), 5)
    panX = cx - (cx - panX) * (scale / prevScale)
    panY = cy - (cy - panY) * (scale / prevScale)
    applyTransform()
  }

  minusBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomByStep(0.85); trackMapZoom('out', 'button', scale) })
  plusBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomByStep(1.18); trackMapZoom('in', 'button', scale) })

  function applyTransform() {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`
    pct.textContent = Math.round(scale * 100) + '%'
  }

  // Fit map to viewport
  function fitToViewport() {
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const scaleX = rect.width / bounds.w
    const scaleY = rect.height / bounds.h
    scale = Math.min(scaleX, scaleY) * 0.9
    panX = (rect.width - bounds.w * scale) / 2
    panY = (rect.height - bounds.h * scale) / 2
    applyTransform()
  }

  el.fitToViewport = fitToViewport

  // Re-measure node heights and redraw edges (needed after display:none → visible)
  el.remeasure = () => {
    for (const [id, pos] of livePos) {
      const nodeEl = nodeEls.get(id)
      if (nodeEl) pos.measuredH = nodeEl.offsetHeight
    }
    redrawAllEdges(edgeLines, livePos)
  }

  // Center on a person at 100% zoom
  el.centerOnPerson = (personName) => {
    const person = people.find(p => p.name === personName)
    if (!person) return
    const pos = livePos.get(person.id)
    if (!pos) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    scale = 1
    panX = rect.width / 2 - (pos.x - bounds.x)
    panY = rect.height * 0.3 - (pos.y - bounds.y)
    applyTransform()
  }

  // Smooth animated pan to a target position
  let animId = null
  function smoothPanTo(targetX, targetY, duration = 600) {
    if (animId) cancelAnimationFrame(animId)
    const startX = panX, startY = panY
    const startTime = performance.now()
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      panX = startX + (targetX - startX) * ease
      panY = startY + (targetY - startY) * ease
      applyTransform()
      if (t < 1) animId = requestAnimationFrame(step)
      else animId = null
    }
    animId = requestAnimationFrame(step)
  }

  // Reveal a person node (un-dim) by name — called when their dialogue scrolls into view
  el.revealPerson = (personName) => {
    const person = people.find(p => p.name === personName)
    if (!person) return

    // Un-dim only on first reveal
    if (!revealedPersonIds.has(person.id)) {
      revealedPersonIds.add(person.id)

      const nodeEl = nodeEls.get(person.id)
      if (nodeEl) nodeEl.classList.remove('dimmed')

      // Also reveal linked people (revealWith)
      const linked = revealWithMap.get(person.id)
      if (linked) {
        for (const linkedId of linked) {
          if (!revealedPersonIds.has(linkedId)) {
            revealedPersonIds.add(linkedId)
            const linkedEl = nodeEls.get(linkedId)
            if (linkedEl) linkedEl.classList.remove('dimmed')
          }
        }
      }

      for (const { path, fromId, toId } of edgeLines) {
        if (revealedPersonIds.has(fromId) && revealedPersonIds.has(toId)) {
          path.classList.remove('dimmed')
        }
      }
    }

    // PC only: smoothly pan to center on every appearance
    if (window.innerWidth >= 1024) {
      const pos = livePos.get(person.id)
      if (!pos) return
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const targetX = rect.width / 2 - (pos.x - bounds.x) * scale
      const targetY = rect.height / 2 - (pos.y - bounds.y) * scale
      smoothPanTo(targetX, targetY)
    }
  }

  // PC scroll focus: highlight + pan (without changing dim/reveal state)
  el.focusPerson = (personName) => {
    const person = people.find(p => p.name === personName)
    if (!person) return

    restoreClickUndimmed()
    nodeEls.forEach(n => n.classList.remove('active'))
    const nodeEl = nodeEls.get(person.id)
    if (nodeEl) nodeEl.classList.add('active')
    highlightEdge(person.id)

    const pos = livePos.get(person.id)
    if (!pos) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const targetX = rect.width / 2 - (pos.x - bounds.x) * scale
    const targetY = rect.height / 2 - (pos.y - bounds.y) * scale
    smoothPanTo(targetX, targetY)
  }

  // Expose openers for external use (e.g. person click in content area)
  el.openPersonModal = (personName) => {
    const person = people.find(p => p.name === personName)
    if (person) openPersonModal(person.id)
  }
  el.openBottomSheet = (personName) => {
    const person = people.find(p => p.name === personName)
    if (person) openBottomSheet(person.id)
  }
  el.highlightEdge = (personName) => {
    const person = people.find(p => p.name === personName)
    highlightEdge(person ? person.id : null)
  }

  // Yoon is always visible from the start
  revealedPersonIds.add('yoonseokyeol')
  const yoonNode = nodeEls.get('yoonseokyeol')
  if (yoonNode) yoonNode.classList.remove('dimmed')

  // Default view: 100% zoom centered on Yoon
  requestAnimationFrame(() => {
    // Auto-measure actual node heights and redraw edges
    for (const [id, pos] of livePos) {
      const nodeEl = nodeEls.get(id)
      if (nodeEl) pos.measuredH = nodeEl.offsetHeight
    }
    redrawAllEdges(edgeLines, livePos)

    const yoonPos = livePos.get('yoonseokyeol')
    if (yoonPos) {
      const rect = el.getBoundingClientRect()
      if (rect.width && rect.height) {
        scale = 1
        panX = rect.width / 2 - (yoonPos.x - bounds.x)
        panY = rect.height * 0.3 - (yoonPos.y - bounds.y)
        applyTransform()
        return
      }
    }
    fitToViewport()
  })

  // Tap on map area dismisses bottom sheet & clears highlight (node clicks stopPropagation)
  el.addEventListener('click', () => {
    if (dragDist > 5) return
    restoreClickUndimmed()
    nodeEls.forEach(n => n.classList.remove('active'))
    highlightEdge(null)
    closeBottomSheet()
  })

  // Mouse drag to pan
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return
    isDragging = true
    dragDist = 0
    startX = e.clientX - panX
    startY = e.clientY - panY
    el.style.cursor = 'grabbing'
  })

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return
    dragDist += Math.abs(e.movementX) + Math.abs(e.movementY)
    panX = e.clientX - startX
    panY = e.clientY - startY
    applyTransform()
  })

  window.addEventListener('mouseup', () => {
    if (isDragging) trackMapPan(dragDist)
    isDragging = false
    el.style.cursor = ''
  })

  // Wheel to zoom (zoom toward cursor)
  el.addEventListener('wheel', (e) => {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const prevScale = scale
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale = Math.min(Math.max(scale * delta, 0.2), 5)

    panX = mx - (mx - panX) * (scale / prevScale)
    panY = my - (my - panY) * (scale / prevScale)
    applyTransform()
    trackMapZoom(e.deltaY > 0 ? 'out' : 'in', 'wheel', scale)
  }, { passive: false })

  // Touch pan & pinch zoom
  let touches = []
  let lastPinchDist = 0

  el.addEventListener('touchstart', (e) => {
    touches = [...e.touches]
    if (touches.length === 1) {
      isDragging = true
      dragDist = 0
      startX = touches[0].clientX - panX
      startY = touches[0].clientY - panY
    } else if (touches.length === 2) {
      isDragging = false
      lastPinchDist = Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
      )
    }
  }, { passive: true })

  el.addEventListener('touchmove', (e) => {
    e.preventDefault()
    if (e.touches.length === 1 && isDragging) {
      dragDist += Math.abs(e.touches[0].clientX - (startX + panX)) + Math.abs(e.touches[0].clientY - (startY + panY))
      panX = e.touches[0].clientX - startX
      panY = e.touches[0].clientY - startY
      applyTransform()
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      )
      const rect = el.getBoundingClientRect()
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top

      const prevScale = scale
      scale = Math.min(Math.max(scale * (dist / lastPinchDist), 0.2), 5)
      panX = mx - (mx - panX) * (scale / prevScale)
      panY = my - (my - panY) * (scale / prevScale)
      lastPinchDist = dist
      applyTransform()
      trackMapZoom(dist > lastPinchDist ? 'in' : 'out', 'pinch', scale)
    }
  }, { passive: false })

  el.addEventListener('touchend', () => {
    if (isDragging) trackMapPan(dragDist)
    isDragging = false
  })

  // ═══════════════════════════════════════════════════
  // Editor mode: node positioning + adjust arrows + export
  // ═══════════════════════════════════════════════════
  const isEditor = new URLSearchParams(window.location.search).has('editor')

  if (isEditor) {
    el.classList.add('editor-mode')

    // Un-dim everything in editor
    nodeEls.forEach(n => n.classList.remove('dimmed'))
    edgeLines.forEach(({ path }) => path.classList.remove('dimmed'))

    // Pick/place state
    let pickedId = null
    let pickedEl = null
    let pickOffsetX = 0, pickOffsetY = 0

    function toCanvasCoords(clientX, clientY) {
      const rect = el.getBoundingClientRect()
      return {
        x: (clientX - rect.left - panX) / scale + bounds.x,
        y: (clientY - rect.top - panY) / scale + bounds.y,
      }
    }

    // Override node clicks for editor pick/place
    nodeEls.forEach((nodeEl, personId) => {
      nodeEl.addEventListener('click', (e) => {
        if (dragDist > 5) return
        e.stopPropagation()

        if (pickedId === personId) {
          // Place: already being moved, just drop
          pickedEl.classList.remove('picked')
          pickedId = null
          pickedEl = null
          return
        }

        // Drop previous if any
        if (pickedEl) pickedEl.classList.remove('picked')

        // Pick this node
        pickedId = personId
        pickedEl = nodeEl
        nodeEl.classList.add('picked')

        const pos = livePos.get(personId)
        const c = toCanvasCoords(e.clientX, e.clientY)
        pickOffsetX = pos.x - c.x
        pickOffsetY = pos.y - c.y
      }, true) // capture phase to override normal click
    })

    // Move picked node with mouse
    el.addEventListener('mousemove', (e) => {
      if (!pickedId) return
      const c = toCanvasCoords(e.clientX, e.clientY)
      const pos = livePos.get(pickedId)
      pos.x = Math.round(c.x + pickOffsetX)
      pos.y = Math.round(c.y + pickOffsetY)
      pickedEl.style.left = `${pos.x - bounds.x}px`
      pickedEl.style.top = `${pos.y - bounds.y}px`
      redrawAllEdges(edgeLines, livePos)
    })

    // Click on empty area drops the node
    el.addEventListener('click', () => {
      if (pickedEl) {
        pickedEl.classList.remove('picked')
        pickedId = null
        pickedEl = null
      }
    })

    // --- Editor toolbar ---
    const toolbar = document.createElement('div')
    toolbar.className = 'editor-toolbar'
    toolbar.innerHTML = `
      <button class="editor-btn" id="editor-adjust-arrows">Adjust Arrows</button>
      <button class="editor-btn editor-btn-primary" id="editor-export">Export State</button>
    `
    el.appendChild(toolbar)

    toolbar.querySelector('#editor-adjust-arrows').addEventListener('click', (e) => {
      e.stopPropagation()
      for (const [id, pos] of livePos) {
        const nodeEl = nodeEls.get(id)
        if (nodeEl) pos.measuredH = nodeEl.offsetHeight
      }
      redrawAllEdges(edgeLines, livePos)
      const btn = e.currentTarget
      btn.textContent = 'Done ✓'
      setTimeout(() => { btn.textContent = 'Adjust Arrows' }, 1200)
    })

    toolbar.querySelector('#editor-export').addEventListener('click', (e) => {
      e.stopPropagation()
      const state = {
        positions: staticMapState.positions.map(sp => {
          const live = livePos.get(sp.id)
          return {
            id: sp.id,
            x: live ? live.x : sp.x,
            y: live ? live.y : sp.y,
            measuredH: live ? live.measuredH : sp.measuredH,
          }
        }),
        styles: staticMapState.styles,
      }
      const js = `export const mapState = ${JSON.stringify(state, null, 2)}\n`
      navigator.clipboard.writeText(js)
      const btn = e.currentTarget
      btn.textContent = 'Copied! ✓'
      setTimeout(() => { btn.textContent = 'Export State' }, 1500)
    })
  }

  return el
}

// Highlight a person node on the map
export function highlightPerson(personName) {
  const map = document.getElementById('relationshipMap')
  if (!map) return

  const person = people.find(p => p.name === personName)
  if (!person) return

  map.querySelectorAll('.map-node.active').forEach(n => n.classList.remove('active'))

  const node = map.querySelector(`.map-node[data-person-id="${person.id}"]`)
  if (node) node.classList.add('active')

  if (map.highlightEdge) map.highlightEdge(personName)
}
