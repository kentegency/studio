// ── SHOTS PANE ────────────────────────────────
const SHOTS = [
  { n:'01', name:'Dial-up connection — close',      meta:'ECU · Archival · 00:08',          status:'progress' },
  { n:'02', name:'MoMo vendor — hands on phone',    meta:'CU · Drama enactment · 00:05',    status:'done'     },
  { n:'03', name:'Banker login — secure terminal',  meta:'MS · Drama enactment · 00:06',    status:'done'     },
  { n:'04', name:'University student — public WiFi',meta:'MS · Drama enactment · 00:05',    status:'progress' },
  { n:'05', name:'Trotro driver — scrolling feed',  meta:'CU · Candid · 00:04',             status:'pending'  },
  { n:'06', name:'Cyber analyst — red alerts',      meta:'WS · Staged · 00:07',             status:'pending'  },
  { n:'07', name:'EBAN fence — digital wireframe',  meta:'Animation · CGI · 00:12',         status:'pending'  },
  { n:'08', name:'Title card — EBAN',               meta:'Motion graphics · 00:04',         status:'pending'  },
]
const SH_COLORS = { done:'#4ADE80', progress:'#F5920C', pending:'#2A2720' }

export function ShotsPane() {
  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">Opening Sequence</div>
        <div className="rp-ti">SHOT LIST</div>
      </div>
      <div className="shot-list">
        {SHOTS.map((s, i) => (
          <div key={i} className="shot" data-hover>
            <span className="sh-n">{s.n}</span>
            <div className="sh-info">
              <div className="sh-name">{s.name}</div>
              <div className="sh-meta">{s.meta}</div>
            </div>
            <div className="sh-dot" style={{ background: SH_COLORS[s.status] }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── TEAM PANE ─────────────────────────────────
const TEAM = [
  { initials:'EN', name:'E. Nii Ayi Solomon', role:'Creative Director · Owner', room:'Studio',  color:'#F5920C', bg:'rgba(245,146,12,0.1)' },
  { initials:'KA', name:'Kwame Asante',        role:'Director of Photography',  room:'Meeting', color:'#1E8A8A', bg:'rgba(30,138,138,0.1)'  },
  { initials:'AB', name:'Ama Boateng',          role:'Score Provider',           room:'Meeting', color:'#F4EFD8', bg:'rgba(244,239,216,0.08)' },
  { initials:'GN', name:'George Nkrumah',       role:'Producer',                room:'Window',  color:'#4ADE80', bg:'rgba(74,222,128,0.08)'  },
]

export function TeamPane({ onInvite }) {
  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">EBAN — Project</div>
        <div className="rp-ti">THE TEAM</div>
      </div>
      <div className="team-list">
        {TEAM.map((m, i) => (
          <div key={i} className="team-member">
            <div className="tm-av" style={{ background: m.color, color: '#040402' }}>{m.initials}</div>
            <div className="tm-info">
              <div className="tm-name">{m.name}</div>
              <div className="tm-role">{m.role}</div>
            </div>
            <span className="tm-badge" style={{ color: m.color, background: m.bg }}>{m.room}</span>
          </div>
        ))}
        <div className="team-member invite" data-hover onClick={() => onInvite?.()}>
          <div className="tm-av invite-av">+</div>
          <div className="tm-info">
            <div className="tm-name muted">Invite contributor</div>
            <div className="tm-role">Generate a scoped access link →</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── STYLE PANE ────────────────────────────────
const PALETTE = ['#F5920C','#1E8A8A','#F4EFD8','#7A7A7A','#4ADE80','#621408']
const FONTS = [
  { label:'Display', value:'Bebas Neue',        style:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'16px' } },
  { label:'Body',    value:'Cormorant',          style:{ fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', fontSize:'14px' } },
  { label:'Mono',    value:'IBM Plex Mono',      style:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'11px' } },
  { label:'Labels',  value:'IBM Plex Mono',      style:{ fontFamily:"'IBM Plex Mono',monospace", fontSize:'9px', letterSpacing:'2px' } },
]
const TOKENS = [
  { k:'--color-accent',  v:'#F5920C' },
  { k:'--color-teal',    v:'#1E8A8A' },
  { k:'--font-display',  v:'Bebas Neue' },
  { k:'--spacing',       v:'normal' },
  { k:'--motion',        v:'cinematic' },
  { k:'--radius',        v:'2px' },
]

import { useState } from 'react'
export function StylePane() {
  const [activeSwatch, setActiveSwatch] = useState(0)
  const [activeFont,   setActiveFont]   = useState(0)

  return (
    <div className="node-pane">
      <div className="rph">
        <div className="rp-ey">EBAN — Project</div>
        <div className="rp-ti">STYLE TOKENS</div>
      </div>
      <div className="style-body">
        <div className="sp-section">
          <div className="sp-label">Project Palette</div>
          <div className="color-row">
            {PALETTE.map((c, i) => (
              <div key={i} className={`cs ${activeSwatch === i ? 'on' : ''}`}
                style={{ background: c }} onClick={() => setActiveSwatch(i)} data-hover />
            ))}
            <div className="cs add-cs" data-hover title="Add">+</div>
          </div>
        </div>

        <div className="sp-section">
          <div className="sp-label">Typography</div>
          <div className="font-rows">
            {FONTS.map((f, i) => (
              <div key={i} className={`fr ${activeFont === i ? 'on' : ''}`}
                onClick={() => setActiveFont(i)} data-hover>
                <span className="fr-l">{f.label}</span>
                <span className="fr-v" style={f.style}>{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sp-section">
          <div className="sp-label">Active Tokens</div>
          <div className="tok-list">
            {TOKENS.map((t, i) => (
              <div key={i} className="tok">
                <span className="tok-k">{t.k}</span>
                <span className="tok-v">{t.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShotsPane
