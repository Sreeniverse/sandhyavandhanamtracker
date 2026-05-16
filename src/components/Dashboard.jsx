import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { useStats } from '../hooks/useStats'
import { SLOTS } from '../utils/slots'
import { cancelSlotReminder, scheduleAllReminders } from '../utils/notifications'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MonthlyHeatmap({ history }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  // Build a lookup: dateStr -> { morning, afternoon, evening }
  const lookup = {}
  for (const r of history) {
    lookup[r.date] = r
  }

  // Build grid for the month
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const daysInMonth = lastDay.getDate()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const cells = []
  // Empty cells before first day
  for (let i = 0; i < startDow; i++) cells.push(null)
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const record = lookup[dateStr]
    let status = 'empty' // no record
    if (record) {
      const m = record.morning?.done
      const a = record.afternoon?.done
      const e = record.evening?.done
      if (m && a && e) status = 'perfect'
      else if (m || a || e) status = 'partial'
      else status = 'missed'
    }
    cells.push({ day: d, dateStr, status, isToday: dateStr === todayStr })
  }

  const statusColor = {
    perfect: 'bg-success text-white',
    partial: 'bg-saffron-400 text-white',
    missed: 'bg-red-400 text-white',
    empty: 'bg-gray-100 text-gray-300',
  }

  return (
    <div className="bg-white rounded-2xl md:rounded-[16px] p-4 md:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-7 h-7 rounded-lg border border-warm bg-white font-syne text-sm cursor-pointer hover:bg-cream transition-colors flex items-center justify-center">&larr;</button>
        <div className="font-syne font-bold text-sm uppercase tracking-wider">{MONTH_NAMES[viewMonth]} {viewYear}</div>
        <button onClick={nextMonth} className="w-7 h-7 rounded-lg border border-warm bg-white font-syne text-sm cursor-pointer hover:bg-cream transition-colors flex items-center justify-center">&rarr;</button>
      </div>
      <div className="grid grid-cols-7 gap-[3px] md:gap-1.5">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[0.55rem] md:text-[0.65rem] font-syne font-semibold text-gray-400 uppercase tracking-wider py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div key={i} className={`aspect-square rounded-[6px] md:rounded-[8px] flex items-center justify-center text-[0.6rem] md:text-xs font-syne font-bold p-[2px] md:p-1 ${cell ? `${statusColor[cell.status]} ${cell.isToday ? 'ring-2 ring-saffron-600' : ''}` : ''}`}>
            {cell ? cell.day : ''}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3 md:gap-4 mt-3">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-[3px] bg-success" /><span className="text-[0.55rem] md:text-[0.65rem] text-gray-400 font-syne">All done</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-[3px] bg-saffron-400" /><span className="text-[0.55rem] md:text-[0.65rem] text-gray-400 font-syne">Partial</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-[3px] bg-red-400" /><span className="text-[0.55rem] md:text-[0.65rem] text-gray-400 font-syne">Missed</span></div>
      </div>
    </div>
  )
}

function ConsistencyRings({ stats }) {
  return (
    <div className="bg-white rounded-2xl md:rounded-[16px] p-4 md:p-5 mb-5 shadow-sm">
      <div className="text-[0.72rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold mb-3 md:mb-4">Slot Consistency</div>
      <div className="flex gap-3 md:gap-6 justify-center">
        {SLOTS.map((slot) => (
          <div key={slot.key} className="text-center">
            <div className={`ring ring-sm md:ring-lg ${slot.color}`} style={{ '--pct': `${stats.slotConsistency[slot.key] || 0}%` }}>
              <div className="ring-core">
                <span className="ring-inner">{stats.slotConsistency[slot.key] || 0}%</span>
              </div>
            </div>
            <div className="text-[0.55rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-1">{slot.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, selectedProfile, familyMembers } = useAuth()
  const { today, history, loading, error, logAction, selectedDate, navigateDate, goToToday, isToday, isPastDate, canGoBack, canGoForward } = useActivities()
  const stats = useStats(history)
  const [confirmUndone, setConfirmUndone] = useState(null)

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-7 h-7 border-3 border-warm border-t-saffron-600 rounded-full animate-spin" /></div>
  }

  const dateObj = new Date(selectedDate + 'T00:00:00')
  const dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const completedSlots = today ? SLOTS.filter((s) => today[s.key]?.done).length : 0

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-sm mb-4">{error}</div>
      )}
      <div className="mb-6 md:mb-8">
        <div className="text-[0.72rem] md:text-xs text-gray-400 uppercase tracking-widest font-syne">Daily Sandhyavandhanam</div>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-xl md:text-[2.2rem] font-extrabold tracking-tight font-syne">{dateDisplay}</div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              className="w-8 h-8 rounded-lg border-1.5 border-warm bg-white font-syne text-sm cursor-pointer flex items-center justify-center text-ink hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => navigateDate(-1)}
              disabled={!canGoBack}
              title="Previous day"
            >
              ←
            </button>
            <button
              className="px-3 h-8 rounded-lg border-1.5 border-warm bg-white font-syne text-[0.68rem] font-bold uppercase tracking-wider cursor-pointer hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={goToToday}
              disabled={isToday}
            >
              Today
            </button>
            <button
              className="w-8 h-8 rounded-lg border-1.5 border-warm bg-white font-syne text-sm cursor-pointer flex items-center justify-center text-ink hover:bg-cream transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => navigateDate(1)}
              disabled={!canGoForward}
              title="Next day"
            >
              →
            </button>
          </div>
        </div>
        <div className="text-gray-400 text-sm mt-1">
          {completedSlots} of 3 rituals completed
        </div>
        {selectedProfile && (
          <div className="text-[0.72rem] text-blue-600 font-semibold font-syne mt-1">Viewing: {selectedProfile.name}'s Rituals</div>
        )}
        {isPastDate && (
          <div className="text-[0.72rem] text-saffron-600 font-semibold font-syne mt-1">Viewing past date - you can mark rituals if missed</div>
        )}
      </div>

      <ConsistencyRings stats={stats} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {SLOTS.map((slot) => {
          const slotData = today?.[slot.key]
          const done = slotData?.done ?? false

          return (
            <div key={slot.key} className={`bg-white rounded-2xl md:rounded-[16px] p-4 md:p-6 shadow-md relative overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-lg flex flex-col ${done ? 'bg-gradient-to-br from-green-50 to-emerald-50' : ''}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${slot.color === 'morning' ? 'bg-gradient-to-r from-amber-400 to-yellow-300' : slot.color === 'afternoon' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-violet-600 to-violet-400'}`} />
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl md:text-3xl">{slot.icon}</span>
                <span className={`text-[0.65rem] md:text-xs font-bold px-2 py-0.5 rounded-full font-syne tracking-wide ${done ? 'bg-success text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {done ? '✓ Done' : 'Pending'}
                </span>
              </div>
              <div className={`text-[0.68rem] md:text-xs uppercase tracking-widest font-syne font-bold mb-0.5 ${slot.color === 'morning' ? 'text-amber-500' : slot.color === 'afternoon' ? 'text-blue-500' : 'text-violet-500'}`}>
                {slot.label}
              </div>
              <div className="text-sm md:text-base font-semibold text-ink mb-2">Sandhyavandhanam</div>

              <button
                className={`w-full py-3 mt-auto rounded-[10px] font-syne text-xs md:text-sm font-bold cursor-pointer tracking-wide border-1.5 transition-all ${done ? 'bg-transparent text-success border-success hover:bg-green-50' : 'bg-ink text-white border-ink hover:bg-[#222]'}`}
                onClick={async () => {
                  if (done) {
                    setConfirmUndone(slot.key)
                    return
                  }
                  await logAction(slot.key, 'done')
                  await cancelSlotReminder(slot.key)
                }}
              >
                {done ? '↩ Mark Undone' : '✓ Mark as Done'}
              </button>
            </div>
          )
        })}
      </div>

      <MonthlyHeatmap history={history} />

      {confirmUndone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold font-syne text-ink mb-2">Mark as Undone?</h3>
            <p className="text-sm text-gray-500 mb-5">This will undo your {SLOTS.find(s => s.key === confirmUndone)?.label || ''} ritual for this day.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border border-warm rounded-[10px] font-syne font-semibold text-sm cursor-pointer hover:bg-cream transition-colors" onClick={() => setConfirmUndone(null)}>Cancel</button>
              <button className="flex-1 py-2.5 bg-red-600 text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer hover:bg-red-700 transition-colors" onClick={async () => {
                await logAction(confirmUndone, 'undone')
                await scheduleAllReminders()
                setConfirmUndone(null)
              }}>Yes, Undo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}