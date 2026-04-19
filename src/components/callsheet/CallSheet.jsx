import { useState, useEffect } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useNodeStore, useUIStore, useAuthStore } from '../../stores'
import './CallSheet.css'

// ── PDF via same Edge Function as Wrap ────────────────────────
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

  if (!res.ok) throw new Error(`PDF error: ${res.status}`)
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const json = await res.json()
    if (json.fallback) return { fallback: true }
    throw new Error(json.error ?? 'Unknown error')
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
  return { fallback: false }
}

function openHTMLFallback(html) {
  const blob = new Blob([html], { type: 'text/html' })
  window.open(URL.createObjectURL(blob), '_blank')
}

// ── STATUS COLOURS ────────────────────────────────────────────
const SH_COLOR = { done:'#4ADE80', progress:'var(--accent)', pending:'#4A4840' }

// ── CALL SHEET HTML TEMPLATE ──────────────────────────────────
function buildCallSheetHTML({ project, node, date, generalCall, location, director, shots, subjects, notes, profile }) {
  const shotsDone    = shots.filter(s => s.status === 'done').length
  const confirmedSub = subjects.filter(s => ['confirmed','filmed'].includes(s.contact_status))
  const dateStr      = date
    ? new Date(date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : 'Date TBC'

  const subjectRows = confirmedSub.map(s => `
    <tr>
      <td style="padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);">
        <div style="font-size:13px;color:#F4EFD8;letter-spacing:.03em;">${s.name}</div>
        <div style="font-size:11px;color:#6A6258;margin-top:2px;">${s.title ?? ''}${s.organisation ? ` · ${s.organisation}` : ''}</div>
      </td>
      <td style="padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);">
        <span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;
          color:${s.contact_status==='confirmed'?'var(--accent)':'#4ADE80'};">
          ${s.contact_status}
        </span>
      </td>
      <td style="padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);font-size:11px;color:#4A4840;">
        ${s.contact_info ?? '—'}
      </td>
    </tr>`).join('')

  const shotRows = shots.map((s, i) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);
        font-family:'IBM Plex Mono',monospace;font-size:11px;color:${accentHex};opacity:.7;">
        ${String(s.number).padStart(2,'0')}
      </td>
      <td style="padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);">
        <div style="font-size:13px;color:#A09890;letter-spacing:.03em;">${s.name}</div>
        <div style="font-size:11px;color:#4A4840;margin-top:2px;letter-spacing:.06em;">
          ${[s.shot_type, s.shot_kind, s.duration].filter(Boolean).join(' · ')}
        </div>
      </td>
      <td style="padding:10px 14px;border-bottom:.5px solid rgba(255,255,255,.05);">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;
          background:${SH_COLOR[s.status]??'#4A4840'};"></span>
      </td>
    </tr>`).join('')

  const noteItems = notes.filter(n => n.room !== 'window').map(n => `
    <div style="padding:12px 16px;background:rgba(12,11,8,1);border-radius:2px;
      border-left:2px solid ${n.color??'var(--accent)'};margin-bottom:6px;">
      <div style="font-size:13px;color:#A09890;line-height:1.65;">${n.body}</div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Call Sheet — ${node.name} — ${dateStr}</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@1,300;1,400&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#040402; color:#F4EFD8; font-family:'IBM Plex Mono',monospace; font-size:13px; }
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none !important; }
  }
  .print-bar {
    position:fixed; top:0; left:0; right:0; height:52px;
    background:rgba(4,4,2,.98); border-bottom:.5px solid rgba(255,255,255,.08);
    display:flex; align-items:center; justify-content:space-between; padding:0 32px; z-index:100;
  }
  .print-label { font-size:11px; letter-spacing:.28em; color:#6A6258; text-transform:uppercase; }
  .print-btn {
    font-size:11px; letter-spacing:.2em; padding:8px 20px;
    text-transform:uppercase; color:${accentHex};
    border:.5px solid rgba(212,170,106,.3); border-radius:2px;
    background:transparent; font-family:'IBM Plex Mono',monospace; cursor:pointer;
  }
  .doc { max-width:860px; margin:0 auto; padding:72px 0 80px; }

  /* HEADER */
  .cs-header { padding:48px 64px 40px; border-bottom:.5px solid rgba(255,255,255,.06); }
  .cs-type { font-size:10px; letter-spacing:.4em; color:${accentHex}; text-transform:uppercase; margin-bottom:20px; }
  .cs-date { font-family:'Bebas Neue',sans-serif; font-size:52px; color:#F4EFD8; line-height:1; letter-spacing:.02em; margin-bottom:8px; }
  .cs-scene { font-family:'Cormorant Garamond',serif; font-style:italic; font-size:20px; color:#7A7268; letter-spacing:.02em; margin-bottom:24px; }
  .cs-rule { width:80px; height:1px; background:linear-gradient(90deg,${accentHex},transparent); margin-bottom:24px; }
  .cs-meta-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0; }
  .cs-meta-cell { padding:16px 0; border-right:.5px solid rgba(255,255,255,.06); padding-right:24px; margin-right:24px; }
  .cs-meta-cell:last-child { border-right:none; }
  .cs-meta-label { font-size:9px; letter-spacing:.3em; color:#4A4840; text-transform:uppercase; margin-bottom:5px; }
  .cs-meta-val { font-size:13px; color:#A09890; letter-spacing:.04em; }

  /* SECTIONS */
  .section { padding:40px 64px; border-top:.5px solid rgba(255,255,255,.06); }
  .sec-eye { font-size:9px; letter-spacing:.4em; color:${accentHex}; text-transform:uppercase; margin-bottom:8px; }
  .sec-title { font-family:'Bebas Neue',sans-serif; font-size:28px; color:#F4EFD8; letter-spacing:.04em; margin-bottom:4px; }
  .sec-rule { width:40px; height:1px; background:linear-gradient(90deg,${accentHex},transparent); margin:14px 0 24px; }

  table { width:100%; border-collapse:collapse; }
  th { font-size:9px; letter-spacing:.28em; color:#4A4840; text-transform:uppercase;
    padding:8px 14px; text-align:left; border-bottom:.5px solid rgba(255,255,255,.08); }

  /* FOOTER */
  .cs-footer { padding:28px 64px; border-top:.5px solid rgba(255,255,255,.06);
    display:flex; justify-content:space-between; align-items:center; }
  .csf-left  { font-size:9px; letter-spacing:.22em; color:#4A4840; text-transform:uppercase; line-height:1.8; }
  .csf-right { font-size:9px; letter-spacing:.14em; color:#3A3530; }

  .empty-row { font-size:12px; color:#4A4840; padding:24px 14px; letter-spacing:.06em; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span class="print-label">Call Sheet — ${node.name}</span>
  <button class="print-btn" onclick="window.print()">Print / Save PDF →</button>
</div>

<div class="doc">

  <!-- HEADER -->
  <div class="cs-header">
    <div class="cs-type">The Kentegency · Call Sheet</div>
    <div class="cs-date">${dateStr}</div>
    <div class="cs-scene">${node.name}${node.act ? ` — ${node.act}` : ''}</div>
    <div class="cs-rule"></div>
    <div class="cs-meta-grid">
      <div class="cs-meta-cell">
        <div class="cs-meta-label">Project</div>
        <div class="cs-meta-val">${project.name}</div>
      </div>
      <div class="cs-meta-cell">
        <div class="cs-meta-label">General Call</div>
        <div class="cs-meta-val">${generalCall || 'TBC'}</div>
      </div>
      <div class="cs-meta-cell">
        <div class="cs-meta-label">Location</div>
        <div class="cs-meta-val">${location || 'TBC'}</div>
      </div>
      <div class="cs-meta-cell" style="margin-top:16px;">
        <div class="cs-meta-label">Director</div>
        <div class="cs-meta-val">${director || profile?.name || 'TBC'}</div>
      </div>
      <div class="cs-meta-cell" style="margin-top:16px;">
        <div class="cs-meta-label">Scene Status</div>
        <div class="cs-meta-val" style="text-transform:uppercase;letter-spacing:.1em;font-size:11px;
          color:${node.status==='approved'||node.status==='locked'?'#4ADE80':node.status==='review'?'#C07010':'var(--accent)'}">
          ${node.status ?? 'concept'}
        </div>
      </div>
      <div class="cs-meta-cell" style="margin-top:16px;">
        <div class="cs-meta-label">Shots</div>
        <div class="cs-meta-val">${shots.length} shots · ${shotsDone} done</div>
      </div>
    </div>
  </div>

  <!-- SUBJECTS / TALENT -->
  <div class="section">
    <div class="sec-eye">Production · People</div>
    <div class="sec-title">Talent & Subjects</div>
    <div class="sec-rule"></div>
    ${confirmedSub.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Name · Title</th>
          <th>Status</th>
          <th>Contact</th>
        </tr>
      </thead>
      <tbody>${subjectRows}</tbody>
    </table>` : `<div class="empty-row">No confirmed subjects assigned to this scene.</div>`}
  </div>

  <!-- SHOT LIST -->
  <div class="section">
    <div class="sec-eye">Production · Shots</div>
    <div class="sec-title">Shot List</div>
    <div class="sec-rule"></div>
    ${shots.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Shot · Type · Kind · Duration</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${shotRows}</tbody>
    </table>` : `<div class="empty-row">No shots added to this scene yet.</div>`}
  </div>

  <!-- NOTES -->
  ${noteItems ? `
  <div class="section">
    <div class="sec-eye">Production · Notes</div>
    <div class="sec-title">Scene Notes</div>
    <div class="sec-rule"></div>
    ${noteItems}
  </div>` : ''}

  <!-- FOOTER -->
  <div class="cs-footer">
    <div class="csf-left">
      THE KENTEGENCY · CREATIVE INTELLIGENCE STUDIO<br>
      ${project.name} · ${node.name} · ${dateStr}
    </div>
    <div class="csf-right">CONFIDENTIAL</div>
  </div>

</div>
</body>
</html>`
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function CallSheet({ onClose }) {
  const { currentProject }  = useProjectStore()
  const { nodes }           = useNodeStore()
  const { showToast }       = useUIStore()
  const { profile }         = useAuthStore()
  const panelRef = useFocusTrap(true)

  const sortedNodes = [...nodes].sort((a,b) => (a.position??0)-(b.position??0))
  const realNodes   = sortedNodes.filter(n => n.id && !n.id.startsWith('cn'))

  const [selectedNodeId, setSelectedNodeId] = useState(realNodes[0]?.id ?? '')
  const [date,           setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [generalCall,    setGeneralCall]    = useState('07:00')
  const [location,       setLocation]       = useState('')
  const [director,       setDirector]       = useState(profile?.name ?? '')
  const [generating,     setGenerating]     = useState(false)
  const [progress,       setProgress]       = useState('')

  // Escape closes
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const selectedNode = realNodes.find(n => n.id === selectedNodeId)

  const generate = async () => {
    if (!currentProject) { showToast('Open a project first.', '#E05050'); return }
    if (!selectedNode)   { showToast('Select a scene.', '#E05050'); return }

    setGenerating(true)
    setProgress('Fetching scene data…')

    try {
      const [
        { data: shots },
        { data: subjects },
        { data: notes },
      ] = await Promise.all([
        supabase.from('shots').select('*')
          .eq('node_id', selectedNode.id).order('number'),
        supabase.from('subjects').select('*')
          .eq('project_id', currentProject.id)
          .contains('node_ids', [selectedNode.id])
          .order('name'),
        supabase.from('notes').select('*')
          .eq('node_id', selectedNode.id)
          .eq('project_id', currentProject.id)
          .order('created_at'),
      ])

      setProgress('Building call sheet…')

      const html = buildCallSheetHTML({
        project:     currentProject,
        node:        selectedNode,
        date,
        generalCall,
        location,
        director,
        shots:       shots    ?? [],
        subjects:    subjects ?? [],
        notes:       notes    ?? [],
        profile,
      })

      setProgress('Generating PDF…')

      const filename = `call-sheet-${selectedNode.name.toLowerCase().replace(/\s+/g,'-')}-${date}.pdf`
      const result   = await generatePDF(html, filename)

      if (result.fallback) {
        openHTMLFallback(html)
        showToast('Opened in browser — use Print to save as PDF.', 'var(--accent)')
      } else {
        showToast(`Call sheet saved — ${filename}`, '#4ADE80')
      }
    } catch (err) {
      console.error('Call sheet error:', err)
      showToast('Could not generate — check Edge Function setup.', '#E05050')
    }

    setGenerating(false)
    setProgress('')
  }

  return (
    <div className="cs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cs-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Call sheet generator">

        {/* Header */}
        <div className="cs-panel-head">
          <div>
            <div className="cs-panel-eye">Production</div>
            <div className="cs-panel-title">Call Sheet</div>
          </div>
          <button className="cs-close" onClick={onClose}>×</button>
        </div>

        {/* Form */}
        <div className="cs-form">

          {/* Scene picker */}
          <div className="cs-field cs-field-full">
            <label className="cs-label">Scene</label>
            {realNodes.length === 0 ? (
              <div className="cs-empty-warn">
                No scenes in this project yet. Add scenes to the arc first.
              </div>
            ) : (
              <select className="cs-select"
                value={selectedNodeId}
                onChange={e => setSelectedNodeId(e.target.value)}>
                {realNodes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name}{n.status ? ` · ${n.status}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scene description preview */}
          {selectedNode?.description && (
            <div className="cs-field cs-field-full">
              <div className="cs-scene-desc">"{selectedNode.description}"</div>
            </div>
          )}

          {/* Date + Call time */}
          <div className="cs-field">
            <label className="cs-label">Shoot Date</label>
            <input className="cs-input" type="date"
              value={date}
              onChange={e => setDate(e.target.value)} />
          </div>
          <div className="cs-field">
            <label className="cs-label">General Call</label>
            <input className="cs-input" type="time"
              value={generalCall}
              onChange={e => setGeneralCall(e.target.value)} />
          </div>

          {/* Location */}
          <div className="cs-field cs-field-full">
            <label className="cs-label">Location</label>
            <input className="cs-input" type="text"
              placeholder="Studio / address / GPS coordinates"
              value={location}
              onChange={e => setLocation(e.target.value)} />
          </div>

          {/* Director */}
          <div className="cs-field cs-field-full">
            <label className="cs-label">Director / CD</label>
            <input className="cs-input" type="text"
              placeholder="Name"
              value={director}
              onChange={e => setDirector(e.target.value)} />
          </div>

          {/* What will be pulled */}
          {selectedNode && (
            <div className="cs-field cs-field-full">
              <div className="cs-preview-label">Will include</div>
              <div className="cs-preview-items">
                <span className="cs-preview-item">Subjects assigned to this scene</span>
                <span className="cs-preview-item">Full shot list</span>
                <span className="cs-preview-item">Scene notes</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cs-panel-foot">
          <button className="cs-cancel" onClick={onClose}>Cancel</button>
          <button className="cs-generate"
            onClick={generate}
            disabled={generating || !selectedNode}>
            {generating ? progress || 'Generating…' : 'Generate call sheet →'}
          </button>
        </div>
      </div>
    </div>
  )
}
