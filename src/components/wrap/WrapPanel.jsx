import { useState } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useNodeStore, useAuthStore, useUIStore } from '../../stores'
import './Wrap.css'

// ── PDF generation via Edge Function ─────────────────────────
async function generatePDF(html, filename) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ html, filename }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PDF function error: ${res.status} ${text}`)
  }

  const contentType = res.headers.get('content-type') ?? ''

  // If function returns JSON fallback (no Browserless token configured)
  if (contentType.includes('application/json')) {
    const json = await res.json()
    if (json.fallback) return { fallback: true }
    throw new Error(json.error ?? 'Unknown error from PDF function')
  }

  // Real PDF binary — trigger download
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return { fallback: false }
}

// ── HTML fallback — open in new tab for browser print ─────────
function openHTMLFallback(html) {
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export default function WrapPanel({ onClose }) {
  const { currentProject } = useProjectStore()
  const { nodes }          = useNodeStore()
  const { profile }        = useAuthStore()
  const { showToast }      = useUIStore()
  const panelRef = useFocusTrap(true)
  const [generating, setGenerating] = useState(false)
  const [progress,   setProgress]   = useState('')

  const approvedNodes = nodes.filter(n => n.status === 'approved' || n.status === 'locked').length

  const generate = async () => {
    if (!currentProject) { showToast('Open a project first.', '#E05050'); return }
    setGenerating(true)
    setProgress('Fetching project data…')

    try {
      const [
        { data: allNotes },
        { data: allShots },
        { data: allAssets },
        { data: contributors },
        { data: subjects },
      ] = await Promise.all([
        supabase.from('notes').select('*, nodes(name)').eq('project_id', currentProject.id).neq('room','studio').order('created_at'),
        supabase.from('shots').select('*, nodes(name)').eq('project_id', currentProject.id).order('number'),
        supabase.from('assets').select('*, nodes(name)').eq('project_id', currentProject.id),
        supabase.from('contributors').select('*').eq('project_id', currentProject.id),
        supabase.from('subjects').select('*').eq('project_id', currentProject.id).order('name'),
      ])

      const sortedNodes = [...nodes].sort((a,b) => (a.position??0)-(b.position??0))
      const date        = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
      const doneShots   = (allShots??[]).filter(s => s.status==='done').length
      const filmedSubjects = (subjects??[]).filter(s => s.contact_status === 'filmed')

      // Use project accent colour throughout the document
      const accentHex   = currentProject.accent_color ?? '#D4AA6A'
      const accentDim   = accentHex + '55' // 33% opacity approximation for decorative uses

      const STATUS_COLOR = { concept:'#6A6258', progress:accentHex, review:'#A88040', approved:'#4ADE80', locked:'#4ADE80' }
      const ACT_COLOR    = (i) => i <= 2 ? '#4A9E9E' : i <= 5 ? accentHex : '#B43C1E'
      const SH_COLOR     = { done:'#4ADE80', progress:accentHex, pending:'#2A2520' }

      setProgress('Assembling document…')

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${currentProject.name} — Wrap</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0E0E11; color:#ECEAE4; font-family:'IBM Plex Mono',monospace; }
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    .no-print { display:none !important; }
  }

  .print-bar {
    position:fixed; top:0; left:0; right:0; height:52px;
    background:rgba(14,14,17,.98); border-bottom:.5px solid rgba(255,255,255,.08);
    display:flex; align-items:center; justify-content:space-between;
    padding:0 32px; z-index:100;
  }
  .print-label { font-size:12px; letter-spacing:.3em; color:#7A7268; text-transform:uppercase; }
  .print-btn {
    font-size:12px; letter-spacing:.2em; padding:9px 22px;
    text-transform:uppercase; color:${accentHex};
    border:.5px solid rgba(212,170,106,.3); border-radius:2px;
    background:transparent; font-family:'IBM Plex Mono',monospace;
    cursor:pointer;
  }

  .doc { max-width:860px; margin:0 auto; padding:72px 0 80px; }

  /* COVER */
  .cover { background:#0E0E11; padding:72px 64px; min-height:520px; display:flex; flex-direction:column; justify-content:space-between; margin-bottom:2px; }
  .cover-type  { font-size:11px; letter-spacing:.4em; color:${accentHex}; text-transform:uppercase; margin-bottom:28px; }
  .cover-title { font-family:'Bebas Neue',sans-serif; font-size:80px; color:#F4EFD8; line-height:.9; letter-spacing:.015em; margin-bottom:20px; }
  .cover-rule  { width:120px; height:1px; background:linear-gradient(90deg,${accentHex},transparent); margin-bottom:20px; }
  .cover-log   { font-family:'Cormorant Garamond',serif; font-size:18px; font-style:italic; color:#7A7268; line-height:1.65; max-width:500px; margin-bottom:32px; }
  .cover-meta  { font-size:11px; letter-spacing:.1em; color:#4A4840; line-height:2; }
  .cover-stats { display:flex; gap:40px; margin-top:24px; flex-wrap:wrap; }
  .cs-val { font-family:'Bebas Neue',sans-serif; font-size:40px; color:${accentHex}; line-height:1; }
  .cs-key { font-size:10px; letter-spacing:.22em; color:#4A4840; text-transform:uppercase; margin-top:4px; }

  /* SECTIONS */
  .section   { padding:56px 64px; border-top:.5px solid rgba(255,255,255,.06); }
  .sec-eye   { font-size:10px; letter-spacing:.4em; color:${accentHex}; text-transform:uppercase; margin-bottom:10px; }
  .sec-title { font-family:'Bebas Neue',sans-serif; font-size:36px; color:#F4EFD8; letter-spacing:.04em; margin-bottom:4px; }
  .sec-rule  { width:60px; height:1px; background:linear-gradient(90deg,${accentHex},transparent); margin:16px 0 28px; }
  /* Brief Q&A */
  .brief-qa  { margin-bottom:24px; padding-bottom:24px; border-bottom:.5px solid rgba(255,255,255,.06); }
  .brief-qa:last-of-type { border-bottom:none; }
  .bq-q { font-size:11px; letter-spacing:.08em; color:#6A6258; text-transform:uppercase; margin-bottom:8px; }
  .bq-a { font-family:'Cormorant Garamond',serif; font-size:17px; font-style:italic; color:#D4CAAA; line-height:1.7; max-width:640px; }
  /* Brief palette */
  .brief-palette-label { font-size:10px; letter-spacing:.3em; color:#4A4840; text-transform:uppercase; margin:28px 0 12px; }
  .brief-palette { display:flex; gap:16px; flex-wrap:wrap; }
  .brief-swatch { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .brief-swatch-label { font-size:10px; color:#6A6258; letter-spacing:.06em; }
  .brief-swatch-hex { font-size:9px; color:#4A4840; font-family:monospace; letter-spacing:.06em; }

  /* SCENES */
  .scene { display:flex; gap:16px; padding:14px 16px; background:rgba(12,11,8,1); border-radius:2px; margin-bottom:6px; border-left:3px solid; }
  .scene-num    { font-size:11px; color:#6A6258; min-width:24px; padding-top:2px; }
  .scene-body   { flex:1; }
  .scene-name   { font-size:14px; color:#F4EFD8; letter-spacing:.04em; margin-bottom:4px; }
  .scene-meta   { font-size:11px; color:#6A6258; letter-spacing:.08em; }
  .scene-status { font-size:10px; letter-spacing:.18em; text-transform:uppercase; margin-top:4px; }
  .scene-shots  { margin-left:auto; font-size:11px; color:#4A4840; letter-spacing:.08em; padding-top:2px; white-space:nowrap; }
  .scene-subjects { font-size:10px; color:#4A4840; letter-spacing:.06em; margin-top:3px; }

  /* SHOTS */
  .shot-group-label { font-size:11px; letter-spacing:.28em; color:${accentHex}; text-transform:uppercase; margin:20px 0 8px; opacity:.7; }
  .shot { display:flex; gap:12px; padding:10px 14px; background:rgba(12,11,8,1); border-radius:2px; margin-bottom:4px; border-left:2px solid; }
  .shot-n    { font-size:11px; color:#6A6258; min-width:20px; }
  .shot-info { flex:1; }
  .shot-name { font-size:13px; color:#A09890; letter-spacing:.04em; margin-bottom:3px; }
  .shot-meta { font-size:11px; color:#4A4840; letter-spacing:.06em; }

  /* PEOPLE */
  .person { display:flex; gap:14px; align-items:flex-start; padding:12px 0; border-bottom:.5px solid rgba(255,255,255,.05); }
  .person-init { width:36px; height:36px; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:500; flex-shrink:0; }
  .person-name { font-size:13px; color:#A09890; letter-spacing:.04em; margin-bottom:2px; }
  .person-title { font-size:11px; color:#6A6258; letter-spacing:.06em; margin-bottom:2px; }
  .person-org   { font-size:11px; color:#4A4840; letter-spacing:.06em; }
  .person-scenes { font-size:10px; color:#4A4840; letter-spacing:.06em; margin-top:4px; }

  /* NOTES */
  .note-item { padding:14px 16px; background:rgba(12,11,8,1); border-radius:2px; border-left:3px solid; margin-bottom:8px; }
  .note-body { font-size:13px; color:#A09890; line-height:1.65; margin-bottom:6px; }
  .note-meta { font-size:10px; color:#4A4840; letter-spacing:.08em; }

  /* TEAM / CREDITS */
  .team-row { display:flex; gap:16px; align-items:center; padding:12px 0; border-bottom:.5px solid rgba(255,255,255,.05); }
  .team-init { width:36px; height:36px; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; color:#040402; flex-shrink:0; }
  .team-name { font-size:13px; color:#A09890; letter-spacing:.04em; }
  .team-role { font-size:11px; color:#4A4840; letter-spacing:.08em; margin-top:3px; }

  /* FOOTER */
  .wrap-footer { padding:32px 64px; border-top:.5px solid rgba(255,255,255,.06); display:flex; justify-content:space-between; align-items:center; }
  .wf-left  { font-size:10px; letter-spacing:.22em; color:#4A4840; text-transform:uppercase; }
  .wf-right { font-size:10px; letter-spacing:.14em; color:#4A4840; }

  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:0 32px; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span class="print-label">The Kentegency — ${currentProject.name} — Wrap</span>
  <button class="print-btn" onclick="window.print()">Print / Save PDF →</button>
</div>

<div class="doc">

  <!-- COVER -->
  <div class="cover page">
    <div>
      <div class="cover-type">${currentProject.type ?? 'Film'} · Creative Direction</div>
      <div class="cover-title">${currentProject.name}</div>
      <div class="cover-rule"></div>
      ${currentProject.logline ? `<div class="cover-log">${currentProject.logline}</div>` : ''}
      <div class="cover-meta">
        Creative Director: ${profile?.name ?? 'The Kentegency'}<br>
        Date: ${date}<br>
        Prepared by The Kentegency · Creative Intelligence Studio
      </div>
    </div>
    <div class="cover-stats">
      <div><div class="cs-val">${nodes.length}</div><div class="cs-key">Scenes</div></div>
      <div><div class="cs-val">${approvedNodes}</div><div class="cs-key">Approved</div></div>
      <div><div class="cs-val">${(allShots??[]).length}</div><div class="cs-key">Shots</div></div>
      <div><div class="cs-val">${doneShots}</div><div class="cs-key">Shots done</div></div>
      <div><div class="cs-val">${(subjects??[]).length}</div><div class="cs-key">Subjects</div></div>
      <div><div class="cs-val">${(contributors??[]).length}</div><div class="cs-key">Team</div></div>
    </div>
  </div>

  <!-- CREATIVE BRIEF — only shown if answers exist -->
  ${(() => {
    const ba = currentProject.brief_answers ?? {}
    // Collect all answered questions across all brief types
    const BRIEF_QS = {
      Film:     ['What is the core story in one sentence?','Who is the primary audience?','What is the emotional tone?','What does success look like for this film?','Reference films that capture the feeling you want?'],
      Brand:    ['What does your brand feel like in three words?','Who is your primary customer?','Three brands you admire and why?','One brand that is everything you are not?','What does success look like 12 months after launch?'],
      Music:    ['What three songs have made you cry and why?','How do you want people to feel after a show?','Who is the fan you are making this for?','What does your album cover look like in your head?','What does your music give people nothing else can?'],
      Website:  ['What is the primary action a visitor should take?','What feeling should the site give in the first 3 seconds?','Three websites you love and why?','What content do you have ready right now?','What does a successful website do for you?'],
      Deck:     ['What is the single ask?','Who makes the final decision in the room?','What are the top 3 objections they will have?','What is the one thing they must remember?','What does a yes look like 6 months from now?'],
      Campaign: ['What is the one feeling this campaign should create?','Who is the person you are trying to reach?','What does this campaign need to do that advertising alone cannot?','Three campaigns that changed how you think about this category?','What does success look like in concrete, measurable terms?'],
    }
    const answered = []
    Object.entries(BRIEF_QS).forEach(([type, qs]) => {
      qs.forEach((q, i) => {
        const key = type + '-' + i
        const val = ba[key]
        if (val && val.trim()) answered.push({ q, a: val.trim() })
      })
    })
    // Also get reference palette
    const palette = ba._palette ?? []
    const palLabels = ba._palette_labels ?? []
    if (answered.length === 0 && palette.length === 0) return ''
    return `
  <div class="section page">
    <div class="sec-eye">Creative Direction</div>
    <div class="sec-title">Creative Brief</div>
    <div class="sec-rule"></div>
    ${answered.map(({ q, a }) => `
      <div class="brief-qa">
        <div class="bq-q">${q}</div>
        <div class="bq-a">${a.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('')}
    ${palette.length > 0 ? `
      <div class="brief-palette-label">Reference palette</div>
      <div class="brief-palette">
        ${palette.map((c, i) => `
          <div class="brief-swatch">
            <div style="width:40px;height:40px;border-radius:3px;background:${c};border:.5px solid rgba(255,255,255,.1)"></div>
            <div class="brief-swatch-label">${palLabels[i] ?? ''}</div>
            <div class="brief-swatch-hex">${c}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>`
  })()}

  <!-- SCENE OVERVIEW -->
  <div class="section page">
    <div class="sec-eye">Project Arc</div>
    <div class="sec-title">Scene Overview</div>
    <div class="sec-rule"></div>
    ${sortedNodes.map((n, i) => {
      const sc        = STATUS_COLOR[n.status] ?? '#6A6258'
      const ac        = ACT_COLOR(i)
      const nodeShots = (allShots??[]).filter(s => s.node_id === n.id)
      const nodeDone  = nodeShots.filter(s => s.status === 'done').length
      const nodeSubjects = (subjects??[]).filter(s => (s.node_ids??[]).includes(n.id))
      return `<div class="scene" style="border-left-color:${ac}">
        <div class="scene-num">${String(i+1).padStart(2,'0')}</div>
        <div class="scene-body">
          <div class="scene-name">${n.name}</div>
          <div class="scene-meta">${n.type ?? 'scene'} · ${Math.round((n.position??0)*100)}% through arc</div>
          <div class="scene-status" style="color:${sc}">${n.status ?? 'concept'}</div>
          ${nodeSubjects.length > 0 ? `<div class="scene-subjects">Subjects: ${nodeSubjects.map(s=>s.name).join(', ')}</div>` : ''}
        </div>
        ${nodeShots.length > 0 ? `<div class="scene-shots">${nodeDone}/${nodeShots.length} shots</div>` : ''}
      </div>`
    }).join('')}
  </div>

  <!-- SHOT LIST -->
  ${(allShots??[]).length > 0 ? `
  <div class="section page">
    <div class="sec-eye">Production</div>
    <div class="sec-title">Shot List</div>
    <div class="sec-rule"></div>
    ${sortedNodes.map(n => {
      const nodeShots = (allShots??[]).filter(s => s.node_id === n.id)
      if (!nodeShots.length) return ''
      return `<div class="shot-group-label">${n.name}</div>
      ${nodeShots.map(s => `<div class="shot" style="border-left-color:${SH_COLOR[s.status]??'#2A2520'}">
        <div class="shot-n">${String(s.number).padStart(2,'0')}</div>
        <div class="shot-info">
          <div class="shot-name">${s.name}</div>
          <div class="shot-meta">${[s.shot_type,s.shot_kind,s.duration].filter(Boolean).join(' · ') || '—'}</div>
        </div>
      </div>`).join('')}`
    }).join('')}
  </div>` : ''}

  <!-- INTERVIEW SUBJECTS -->
  ${(subjects??[]).length > 0 ? `
  <div class="section page">
    <div class="sec-eye">Production Bible</div>
    <div class="sec-title">Interview Subjects</div>
    <div class="sec-rule"></div>
    <div class="two-col">
    ${(subjects??[]).map(s => {
      const sceneNames = sortedNodes.filter(n => (s.node_ids??[]).includes(n.id)).map(n=>n.name)
      const initials   = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
      const CONTACT_COLORS = { prospect:'#6A6258', contacted:accentHex, confirmed:'#4A9E9E', filmed:'#4ADE80', declined:'#E05050' }
      return `<div class="person">
        <div class="person-init" style="background:${s.color??'#4A9E9E'}22;color:${s.color??'#4A9E9E'};border:.5px solid ${s.color??'#4A9E9E'}44">${initials}</div>
        <div>
          <div class="person-name">${s.name}</div>
          ${s.title ? `<div class="person-title">${s.title}</div>` : ''}
          ${s.organisation ? `<div class="person-org">${s.organisation}</div>` : ''}
          <div class="person-title" style="color:${CONTACT_COLORS[s.contact_status]??'#6A6258'};margin-top:3px">${s.contact_status ?? 'prospect'}</div>
          ${sceneNames.length > 0 ? `<div class="person-scenes">Scenes: ${sceneNames.join(', ')}</div>` : ''}
        </div>
      </div>`
    }).join('')}
    </div>
  </div>` : ''}

  <!-- KEY DECISIONS -->
  ${(allNotes??[]).length > 0 ? `
  <div class="section page">
    <div class="sec-eye">Approvals & Feedback</div>
    <div class="sec-title">Key Decisions</div>
    <div class="sec-rule"></div>
    ${(allNotes??[]).slice(0,24).map(n => `
      <div class="note-item" style="border-left-color:${n.color??'#4A9E9E'}">
        <div class="note-body">${n.body}</div>
        <div class="note-meta">${n.nodes?.name ? n.nodes.name + ' · ' : ''}${n.room} · ${new Date(n.created_at).toLocaleDateString('en-GB')}</div>
      </div>`).join('')}
  </div>` : ''}

  <!-- CREDITS -->
  <div class="section">
    <div class="sec-eye">Credits</div>
    <div class="sec-title">The Team</div>
    <div class="sec-rule"></div>
    <div class="team-row">
      <div class="team-init" style="background:${currentProject.accent_color??'${accentHex}'}">${(profile?.name??'CD').slice(0,2).toUpperCase()}</div>
      <div>
        <div class="team-name">${profile?.name ?? 'Creative Director'}</div>
        <div class="team-role">Creative Director · The Kentegency</div>
      </div>
    </div>
    ${(contributors??[]).map(c => `
      <div class="team-row">
        <div class="team-init" style="background:${c.color??'#4A9E9E'}">${c.name.slice(0,2).toUpperCase()}</div>
        <div>
          <div class="team-name">${c.name}</div>
          <div class="team-role">${c.role}</div>
        </div>
      </div>`).join('')}
  </div>

  <!-- FOOTER -->
  <div class="wrap-footer">
    <div class="wf-left">The Kentegency · Creative Intelligence Studio</div>
    <div class="wf-right">${currentProject.name} · ${date}</div>
  </div>

</div>
</body>
</html>`

      setProgress('Generating PDF…')

      const filename = `${currentProject.name.replace(/[^a-z0-9]/gi,'_').toLowerCase()}_wrap_${new Date().toISOString().slice(0,10)}.pdf`

      // Save a version snapshot before generating
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const snapshot = {
          project:  { ...currentProject },
          nodes:    sortedNodes,
          acts:     (await supabase.from('acts').select('*').eq('project_id', currentProject.id)).data ?? [],
          savedAt:  new Date().toISOString(),
          nodeCount: sortedNodes.length,
          approvedCount: sortedNodes.filter(n => n.status === 'approved' || n.status === 'locked').length,
        }
        await supabase.from('versions').insert({
          project_id:    currentProject.id,
          snapshot_data: snapshot,
          description:   `Wrap — ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })} · ${sortedNodes.length} scenes`,
          created_by:    user?.id,
        })
      } catch (vErr) {
        console.warn('Version snapshot failed (non-critical):', vErr)
      }

      // Try Edge Function first
      try {
        const result = await generatePDF(html, filename)
        if (result.fallback) {
          // No Browserless token — open HTML in new tab with print button
          openHTMLFallback(html)
          showToast('Opened in new tab. Click "Print / Save PDF" to download.', '${accentHex}')
        } else {
          showToast(`${filename} downloaded.`, '#4ADE80')
          onClose()
        }
      } catch (fnErr) {
        // Edge Function not deployed yet — fall back to HTML tab
        console.warn('PDF function unavailable, using HTML fallback:', fnErr)
        openHTMLFallback(html)
        showToast('Opened in new tab. Click "Print / Save PDF" to download.', '${accentHex}')
      }

    } catch (err) {
      console.error('Wrap error:', err)
      showToast('Could not generate wrap. Check console.', '#E05050')
    }

    setGenerating(false)
    setProgress('')
  }

  return (
    <div className="wrap-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wrap-panel" ref={panelRef} role="dialog" aria-modal="true">
        <div className="wrap-head">
          <div>
            <div className="wrap-title">Wrap it</div>
            <div className="wrap-sub">Generate your project document</div>
          </div>
          <button className="wrap-close" onClick={onClose}>×</button>
        </div>

        <div className="wrap-summary">
          <div className="ws-project">{currentProject?.name ?? 'No project open'}</div>
          <div className="ws-stats">
            <div className="ws-stat"><div className="ws-val">{nodes.length}</div><div className="ws-key">Scenes</div></div>
            <div className="ws-stat"><div className="ws-val">{approvedNodes}</div><div className="ws-key">Approved</div></div>
            <div className="ws-stat">
              <div className="ws-val">{nodes.length > 0 ? Math.round((approvedNodes/nodes.length)*100) : 0}%</div>
              <div className="ws-key">Complete</div>
            </div>
          </div>
        </div>

        <div className="wrap-includes">
          <div className="wi-label">What's included</div>
          {[
            'Cover — project name, logline, Creative Director, date, stats',
            'Scene overview — all scenes with status, position, subjects',
            'Shot list — organised by scene, status colour-coded',
            'Interview subjects — from People tab, with scene assignments',
            'Key decisions — all client feedback and approvals',
            'Credits — the full team',
          ].map((item, i) => (
            <div key={i} className="wi-item">
              <span className="wi-icon">▸</span>
              <span>{item}</span>
            </div>
          ))}
          <div className="wi-note" style={{ marginTop: 8 }}>
            Downloads as a PDF directly. If the PDF service is unavailable,
            opens in a new tab with a print button as fallback.
          </div>
        </div>

        <div className="wrap-foot">
          <button className="wrap-cancel" onClick={onClose} data-hover>Cancel</button>
          <button className="wrap-generate"
            onClick={generate}
            disabled={generating || !currentProject}
            data-hover>
            {generating ? (progress || 'Building…') : 'Generate PDF →'}
          </button>
        </div>
      </div>
    </div>
  )
}
