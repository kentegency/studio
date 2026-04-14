import { useEffect, useState } from 'react'
import { useUIStore } from '../../stores'
import EntryLine from './EntryLine'
import './Entry.css'

export default function Entry() {
  const setScreen = useUIStore(s => s.setScreen)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 180),   // eyebrow
      setTimeout(() => setStep(2), 400),   // title
      setTimeout(() => setStep(3), 680),   // rule
      setTimeout(() => setStep(4), 820),   // logline
      setTimeout(() => setStep(5), 950),   // line
      setTimeout(() => setStep(6), 2200),  // invite + minimap
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const enter = () => setScreen('auth')

  return (
    <div className="entry" onClick={enter}>
      <div className="atm">
        <div className="atm-v" />
        <div className="atm-o" />
        <div className="atm-t" />
        <div className="atm-r" />
        <div className="atm-lk" />
        <div className="atm-lk2" />
      </div>

      <div className={`entry-eye ${step >= 1 ? 'on' : ''}`}>
        Creative Intelligence Studio
      </div>

      <div className={`entry-title ${step >= 2 ? 'on' : ''}`}>
        <div className="entry-t1">
          <span>EBAN</span>
          <span className="entry-slash">&nbsp;/</span>
        </div>
        <span className="entry-t2">Ghana's Cybersecurity Journey</span>
      </div>

      <div className={`entry-rule ${step >= 3 ? 'on' : ''}`} />

      <div className={`entry-log ${step >= 4 ? 'on' : ''}`}>
        From the first connection to the next frontier —<br />
        a nation learning to protect what it values most.
      </div>

      <EntryLine visible={step >= 5} />

      <div className={`entry-invite ${step >= 6 ? 'on' : ''}`}>
        tap anywhere to enter <em>→</em>
      </div>

      <div className={`entry-mini ${step >= 6 ? 'on' : ''}`}>
        <span className="em-l">arc</span>
        <div className="em-track">
          <div className="em-zone" style={{ left:'2%', width:'26%', background:'rgba(30,138,138,0.4)' }} />
          <div className="em-zone" style={{ left:'30%', width:'31%', background:'rgba(245,146,12,0.32)' }} />
          <div className="em-zone" style={{ left:'63%', width:'34%', background:'rgba(180,60,30,0.36)' }} />
          <div className="em-indicator" />
        </div>
        <span className="em-l">9 nodes · 40 min</span>
      </div>
    </div>
  )
}
