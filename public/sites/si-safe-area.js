;(function () {
  var root = document.documentElement
  var sides = ['top', 'right', 'bottom', 'left']

  function apply(insets) {
    sides.forEach(function (side) {
      root.style.setProperty('--si-safe-' + side, ((insets && insets[side]) || 0) + 'px')
    })
  }

  apply()

  window.addEventListener('message', function (event) {
    var data = event.data
    if (!data || data.type !== 'si:safe-area') return
    apply(data.insets)
    root.setAttribute('data-si-aware', '')
    window.dispatchEvent(new CustomEvent('si:safe-area', { detail: data.insets }))
  })

  if (window.parent !== window) window.parent.postMessage({ type: 'si:hello', version: 1 }, '*')

  document.addEventListener('keydown', function (event) {
    if (event.key === 's' && !event.target.closest('input, textarea')) root.toggleAttribute('data-si-show-safe')
  })
})()
