import { useEffect, useRef } from 'react'
import './Cursor.css'

export default function Cursor() {
  const curRef = useRef(null)

  useEffect(() => {
    const cur = curRef.current
    if (!cur) return

    const move = (e) => {
      cur.style.left = e.clientX + 'px'
      cur.style.top  = e.clientY + 'px'
    }

    const down = () => cur.classList.add('ck')
    const up   = () => cur.classList.remove('ck')

    document.addEventListener('mousemove', move)
    document.addEventListener('mousedown', down)
    document.addEventListener('mouseup',   up)

    // Hover detection via delegation
    const hover = (e) => {
      const el = e.target
      const isHoverable = el.closest(
        '.sbi, .tb-r, .tbb, .at, .note, .sh, .tm, .rp-tab, .stc-btn, ' +
        '.sk-tool, .sk-col, .qc-btn, .qcp-mode, .qcp-send, .cs, .fr, ' +
        '.cmp-sel, .bf-btn, .bt, .nh-a, .cn, .di, button, a, [data-hover]'
      )
      if (isHoverable) cur.classList.add('h')
      else cur.classList.remove('h')
    }

    document.addEventListener('mouseover', hover)

    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mousedown', down)
      document.removeEventListener('mouseup',   up)
      document.removeEventListener('mouseover', hover)
    }
  }, [])

  return <div id="cur" ref={curRef} />
}
