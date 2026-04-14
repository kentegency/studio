import { useState } from 'react'
import { jsPDF } from 'jspdf'
import { supabase } from '../../lib/supabase'
import { useProjectStore, useNodeStore, useAuthStore, useUIStore } from '../../stores'
import './Wrap.css'

export default function WrapPanel({ onClose }) {
  const { currentProject } = useProjectStore()
  const { nodes }          = useNodeStore()
  const { profile }        = useAuthStore()
  const { showToast }      = useUIStore()
  const [generating, setGenerating] = useState(false)
  const [preview,    setPreview]    = useState(false)

  const generate = async () => {
    if (!currentProject) { showToast('Open a project first.', '#E05050'); return }
    setGenerating(true)

    try {
      // Fetch all project data
      const [{ data: allNotes }, { data: allShots }, { data: allAssets }, { data: contributors }] = await Promise.all([
        supabase.from('notes').select('*,nodes(name)').eq('project_id', currentProject.id).eq('resolved', false).order('created_at'),
        supabase.from('shots').select('*,nodes(name)').eq('project_id', currentProject.id),
        supabase.from('assets').select('*,nodes(name)').eq('project_id', currentProject.id),
        supabase.from('contributors').select('*').eq('project_id', currentProject.id),
      ])

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, H = 297
      const M = 20 // margin
      let y = M

      const addPage = () => { doc.addPage(); y = M }
      const checkY = (needed) => { if (y + needed > H - M) addPage() }

      // Colours
      const C = {
        black:  [4,   4,   2],
        orange: [245, 146, 12],
        teal:   [30,  138, 138],
        cream:  [244, 239, 216],
        dim:    [160, 152, 144],
        mute:   [106, 98,  88],
        bg:     [12,  11,  8],
        green:  [74,  222, 128],
      }

      // ── COVER PAGE ──────────────────────────────
      doc.setFillColor(...C.black)
      doc.rect(0, 0, W, H, 'F')

      // Orange accent bar
      doc.setFillColor(...C.orange)
      doc.rect(M, 30, 80, 1, 'F')

      // Project type
      doc.setFontSize(9)
      doc.setTextColor(...C.orange)
      doc.setFont('helvetica', 'normal')
      doc.text((currentProject.type ?? 'film').toUpperCase(), M, 44, { charSpace: 2 })

      // Project name
      doc.setFontSize(32)
      doc.setTextColor(...C.cream)
      doc.setFont('helvetica', 'bold')
      const nameLines = doc.splitTextToSize(currentProject.name, W - M * 2)
      doc.text(nameLines, M, 60)
      y = 60 + nameLines.length * 14

      // Logline
      if (currentProject.logline) {
        doc.setFontSize(12)
        doc.setTextColor(...C.dim)
        doc.setFont('helvetica', 'italic')
        const logLines = doc.splitTextToSize(currentProject.logline, W - M * 2)
        doc.text(logLines, M, y + 10)
        y += 10 + logLines.length * 7
      }

      // Metadata
      y += 16
      doc.setFontSize(9)
      doc.setTextColor(...C.mute)
      doc.setFont('helvetica', 'normal')
      doc.text(`Creative Director: ${profile?.name ?? 'The Kentegency'}`, M, y, { charSpace: 1 })
      y += 7
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}`, M, y, { charSpace: 1 })
      y += 7
      doc.text(`Scenes: ${nodes.length} · Assets: ${allAssets?.length ?? 0} · Notes: ${allNotes?.length ?? 0}`, M, y, { charSpace: 1 })

      // Teal accent at bottom
      doc.setFillColor(...C.teal)
      doc.rect(M, H - 30, 40, 1, 'F')
      doc.setFontSize(8)
      doc.setTextColor(...C.teal)
      doc.text('THE KENTEGENCY · CREATIVE INTELLIGENCE STUDIO', M, H - 22, { charSpace: 1.5 })

      // ── TIMELINE ARC ────────────────────────────
      addPage()
      doc.setFillColor(...C.black)
      doc.rect(0, 0, W, H, 'F')

      doc.setFontSize(8)
      doc.setTextColor(...C.orange)
      doc.setFont('helvetica', 'normal')
      doc.text('PROJECT ARC', M, y, { charSpace: 2 })
      y += 10

      doc.setFontSize(18)
      doc.setTextColor(...C.cream)
      doc.setFont('helvetica', 'bold')
      doc.text('SCENE OVERVIEW', M, y)
      y += 4

      doc.setFillColor(...C.orange)
      doc.rect(M, y + 2, 30, 0.5, 'F')
      y += 12

      // Scene list
      const sortedNodes = [...nodes].sort((a,b) => (a.position??0) - (b.position??0))
      sortedNodes.forEach((node, i) => {
        checkY(22)

        // Status color
        const statusColors = {
          concept:  C.mute, progress: C.orange,
          review:   [192,112,16], approved: C.green, locked: C.green
        }
        const sc = statusColors[node.status] ?? C.mute

        // Node row
        doc.setFillColor(...C.bg)
        doc.rect(M, y, W - M*2, 16, 'F')

        // Status indicator
        doc.setFillColor(...sc)
        doc.rect(M, y, 2, 16, 'F')

        // Number
        doc.setFontSize(8)
        doc.setTextColor(...C.mute)
        doc.setFont('helvetica', 'normal')
        doc.text(String(i+1).padStart(2,'0'), M + 6, y + 6, { charSpace: 1 })

        // Name
        doc.setFontSize(11)
        doc.setTextColor(...C.cream)
        doc.setFont('helvetica', 'bold')
        doc.text(node.name, M + 18, y + 6)

        // Status
        doc.setFontSize(8)
        doc.setTextColor(...sc)
        doc.setFont('helvetica', 'normal')
        doc.text((node.status ?? 'concept').toUpperCase(), M + 18, y + 12, { charSpace: 1 })

        // Shot count
        const nodeShots = allShots?.filter(s => s.node_id === node.id) ?? []
        const doneShots = nodeShots.filter(s => s.status === 'done').length
        if (nodeShots.length > 0) {
          doc.setTextColor(...C.mute)
          doc.text(`${doneShots}/${nodeShots.length} shots`, W - M - 30, y + 9)
        }

        y += 20
      })

      // ── SHOT LIST ───────────────────────────────
      if (allShots?.length > 0) {
        addPage()
        doc.setFillColor(...C.black)
        doc.rect(0, 0, W, H, 'F')

        doc.setFontSize(8)
        doc.setTextColor(...C.teal)
        doc.setFont('helvetica', 'normal')
        doc.text('PRODUCTION', M, y, { charSpace: 2 })
        y += 10

        doc.setFontSize(18)
        doc.setTextColor(...C.cream)
        doc.setFont('helvetica', 'bold')
        doc.text('SHOT LIST', M, y)
        y += 4

        doc.setFillColor(...C.teal)
        doc.rect(M, y + 2, 20, 0.5, 'F')
        y += 14

        const doneCount = allShots.filter(s => s.status === 'done').length
        doc.setFontSize(9)
        doc.setTextColor(...C.dim)
        doc.setFont('helvetica', 'normal')
        doc.text(`${doneCount} of ${allShots.length} shots complete`, M, y)
        y += 10

        // Group by node
        sortedNodes.forEach(node => {
          const nodeShots = allShots.filter(s => s.node_id === node.id)
          if (nodeShots.length === 0) return
          checkY(16)

          doc.setFontSize(9)
          doc.setTextColor(...C.orange)
          doc.setFont('helvetica', 'bold')
          doc.text(node.name.toUpperCase(), M, y, { charSpace: 1 })
          y += 8

          nodeShots.forEach(shot => {
            checkY(10)
            const sc = shot.status==='done' ? C.green : shot.status==='progress' ? C.orange : C.mute
            doc.setFillColor(...sc)
            doc.rect(M, y - 2, 1.5, 5, 'F')

            doc.setFontSize(9)
            doc.setTextColor(...C.dim)
            doc.setFont('helvetica', 'normal')
            doc.text(`${String(shot.number).padStart(2,'0')}  ${shot.name}`, M + 5, y + 1)

            doc.setFontSize(8)
            doc.setTextColor(...C.mute)
            const meta = [shot.shot_type, shot.shot_kind, shot.duration].filter(Boolean).join(' · ')
            doc.text(meta, M + 5, y + 6)

            y += 12
          })
          y += 4
        })
      }

      // ── KEY NOTES ───────────────────────────────
      const meetingNotes = allNotes?.filter(n => n.room !== 'studio') ?? []
      if (meetingNotes.length > 0) {
        addPage()
        doc.setFillColor(...C.black)
        doc.rect(0, 0, W, H, 'F')

        doc.setFontSize(8)
        doc.setTextColor(...C.green)
        doc.setFont('helvetica', 'normal')
        doc.text('APPROVALS & NOTES', M, y, { charSpace: 2 })
        y += 10

        doc.setFontSize(18)
        doc.setTextColor(...C.cream)
        doc.setFont('helvetica', 'bold')
        doc.text('KEY DECISIONS', M, y)
        y += 4
        doc.setFillColor(...C.green)
        doc.rect(M, y + 2, 25, 0.5, 'F')
        y += 14

        meetingNotes.slice(0, 20).forEach(note => {
          checkY(20)
          const bodyLines = doc.splitTextToSize(note.body, W - M*2 - 10)
          const blockH = bodyLines.length * 5.5 + 14

          doc.setFillColor(...C.bg)
          doc.rect(M, y, W - M*2, blockH, 'F')

          // Color stripe
          const nc = note.color ? note.color.match(/\w\w/g)?.map(h => parseInt(h,16)) : C.teal
          doc.setFillColor(nc[0]??30, nc[1]??138, nc[2]??138)
          doc.rect(M, y, 2, blockH, 'F')

          doc.setFontSize(9)
          doc.setTextColor(...C.dim)
          doc.setFont('helvetica', 'normal')
          bodyLines.forEach((line, i) => {
            doc.text(line, M + 7, y + 7 + i * 5.5)
          })

          const meta = `${note.nodes?.name ?? ''} · ${note.room} · ${new Date(note.created_at).toLocaleDateString('en-GB')}`
          doc.setFontSize(7.5)
          doc.setTextColor(...C.mute)
          doc.text(meta, M + 7, y + blockH - 4, { charSpace: 0.5 })

          y += blockH + 5
        })
      }

      // ── CONTRIBUTORS ────────────────────────────
      if (contributors?.length > 0) {
        checkY(60)
        y += 10

        doc.setFontSize(8)
        doc.setTextColor(...C.dim)
        doc.setFont('helvetica', 'normal')
        doc.text('THE TEAM', M, y, { charSpace: 2 })
        y += 8

        contributors.forEach(c => {
          checkY(10)
          doc.setFontSize(10)
          doc.setTextColor(...C.cream)
          doc.setFont('helvetica', 'bold')
          doc.text(c.name, M, y)
          doc.setFontSize(8)
          doc.setTextColor(...C.mute)
          doc.setFont('helvetica', 'normal')
          doc.text(c.role, M + 60, y, { charSpace: 0.5 })
          y += 8
        })
      }

      // Save
      const filename = `${currentProject.name.replace(/[^a-z0-9]/gi,'_')}_wrap.pdf`
      doc.save(filename)
      showToast(`${filename} downloaded.`, '#4ADE80')
      setPreview(true)

    } catch (err) {
      console.error('Wrap error:', err)
      showToast('Could not generate PDF. Check console.', '#E05050')
    }

    setGenerating(false)
  }

  const totalShots    = 0
  const approvedNodes = nodes.filter(n => n.status === 'approved' || n.status === 'locked').length

  return (
    <div className="wrap-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wrap-panel">
        <div className="wrap-head">
          <div>
            <div className="wrap-title">Wrap it</div>
            <div className="wrap-sub">Generate your project case study as a PDF</div>
          </div>
          <button className="wrap-close" onClick={onClose}>×</button>
        </div>

        {/* PROJECT SUMMARY */}
        <div className="wrap-summary">
          <div className="ws-project">{currentProject?.name ?? 'No project open'}</div>
          <div className="ws-stats">
            <div className="ws-stat">
              <div className="ws-val">{nodes.length}</div>
              <div className="ws-key">Scenes</div>
            </div>
            <div className="ws-stat">
              <div className="ws-val">{approvedNodes}</div>
              <div className="ws-key">Approved</div>
            </div>
            <div className="ws-stat">
              <div className="ws-val">{nodes.length > 0 ? Math.round((approvedNodes/nodes.length)*100) : 0}%</div>
              <div className="ws-key">Complete</div>
            </div>
          </div>
        </div>

        {/* WHAT'S INCLUDED */}
        <div className="wrap-includes">
          <div className="wi-label">What's included in the PDF</div>
          {[
            { icon:'▸', text:'Cover page — project name, logline, Creative Director, date' },
            { icon:'▸', text:'Scene overview — all scenes with status and shot completion' },
            { icon:'▸', text:'Full shot list — organised by scene, with status indicators' },
            { icon:'▸', text:'Key decisions — all approved notes and client feedback' },
            { icon:'▸', text:'The team — contributors and their roles' },
          ].map((item, i) => (
            <div key={i} className="wi-item">
              <span className="wi-icon">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {preview && (
          <div className="wrap-success">
            ✓ PDF generated and downloaded. Check your Downloads folder.
          </div>
        )}

        <div className="wrap-foot">
          <button className="wrap-cancel" onClick={onClose} data-hover>Cancel</button>
          <button className="wrap-generate"
            onClick={generate} disabled={generating || !currentProject}
            data-hover>
            {generating ? 'Generating…' : 'Generate PDF →'}
          </button>
        </div>
      </div>
    </div>
  )
}
