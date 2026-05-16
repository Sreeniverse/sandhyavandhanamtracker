import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabase'
import { SLOTS } from '../utils/slots'
import { friendlyError } from '../utils/errors'

const PAGE_SIZE = 30

export default function CommunityPage() {
  const { user } = useAuth()

  const [communityStats, setCommunityStats] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)

  async function loadData() {
    setError('')
    setLoading(true)
    try {
      const [slotRes, leaderboardRes] = await Promise.all([
        supabase.rpc('get_community_slot_stats'),
        supabase.rpc('get_unified_leaderboard', { limit_count: PAGE_SIZE, offset_count: 0 }),
      ])

      if (slotRes.data) {
        const bySlot = {}
        slotRes.data.forEach(({ slot, pct }) => { bySlot[slot] = pct })
        setCommunityStats(bySlot)
      }

      if (leaderboardRes.data) {
        setLeaderboard(leaderboardRes.data)
        setOffset(leaderboardRes.data.length)
        setHasMore(leaderboardRes.data.length === PAGE_SIZE)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      const res = await supabase.rpc('get_unified_leaderboard', { limit_count: PAGE_SIZE, offset_count: offset })
      if (res.data) {
        setLeaderboard(prev => [...prev, ...res.data])
        setOffset(prev => prev + res.data.length)
        setHasMore(res.data.length === PAGE_SIZE)
      }
    } catch (err) {
      console.error(friendlyError(err))
    } finally {
      setLoadingMore(false)
    }
  }, [offset, loadingMore])

  useEffect(() => {
    loadData()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-7 h-7 border-3 border-warm border-t-saffron-600 rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-[10px] text-sm mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button
            className="ml-3 px-3 py-1 bg-amber-100 border border-amber-300 rounded-[8px] font-syne font-bold text-xs cursor-pointer hover:bg-amber-200 transition-colors disabled:opacity-50"
            onClick={() => { setRetrying(true); loadData() }}
            disabled={retrying}
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}
      <div className="mb-5 md:mb-8">
        <div className="text-[0.65rem] md:text-[0.7rem] text-gray-400 uppercase tracking-widest font-syne">Community</div>
        <div className="text-xl md:text-[2rem] font-extrabold tracking-tight font-syne mt-0.5">Leaderboard</div>
        <div className="text-gray-400 text-sm mt-0.5">All practitioners and their family members</div>
      </div>

      {/* Community Slot Consistency rings */}
      <div className="bg-white rounded-2xl md:rounded-[16px] p-4 md:p-5 mb-5 md:mb-8 shadow-md">
        <div className="text-[0.62rem] md:text-[0.75rem] uppercase tracking-widest text-gray-400 font-syne font-semibold mb-3 md:mb-4">Community Slot Consistency</div>
        <div className="flex gap-3 md:gap-8 justify-center">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="text-center">
              <div className={`ring ring-sm md:ring-lg ${slot.color}`} style={{ '--pct': `${communityStats ? (communityStats[slot.key] || 0) : 0}%` }}>
                <div className="ring-core">
                  <span className="ring-inner">{communityStats ? `${(communityStats[slot.key] || 0).toFixed(0)}%` : '-'}</span>
                </div>
              </div>
              <div className="text-[0.55rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-1">{slot.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard list - Desktop table */}
      <div className="hidden md:block bg-white rounded-[16px] shadow-md overflow-hidden">
        <div className="grid gap-4 px-6 py-2.5 bg-cream font-syne text-[0.62rem] uppercase tracking-wider text-gray-400" style={{ gridTemplateColumns: '1fr 60px 1fr 1fr 1fr 80px' }}>
          <span>Name</span><span className="text-center">Days</span><span className="text-center">Prathah</span><span className="text-center">Madhyahnika</span><span className="text-center">Saayam</span><span className="text-center">%</span>
        </div>
        {leaderboard.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No community data yet. Start tracking to appear on the leaderboard!</div>
        )}
        {leaderboard.map((entry, i) => {
          const isMe = entry.user_id === user?.id && !entry.parent_name
          const isMySon = entry.user_id === user?.id && !!entry.parent_name
          return (
            <div key={`${entry.user_id}-${entry.name}-${i}`} className={`grid gap-4 px-6 py-2.5 border-b border-black/[0.03] items-center hover:bg-saffron-50/30 transition-colors ${isMe || isMySon ? 'bg-saffron-50' : ''}`} style={{ gridTemplateColumns: '1fr 60px 1fr 1fr 1fr 80px' }}>
              <div className="font-bold text-sm">
                {entry.name}
                {isMe && <span className="bg-saffron-500 text-white px-2 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider ml-1">You</span>}
                {isMySon && <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider ml-1">Son</span>}
                {entry.parent_name && <div className="text-[0.65rem] text-gray-400 font-normal">{entry.parent_name}&apos;s son</div>}
              </div>
              <div className="font-syne font-extrabold text-sm text-center">{entry.days}</div>
              <div className="font-syne text-sm text-center font-bold text-[#f59e0b]">{entry.prathah}<span className="text-[0.65rem] text-[#f59e0b]/50">/{entry.days}</span></div>
              <div className="font-syne text-sm text-center font-bold text-[#3b82f6]">{entry.madhyahnika}<span className="text-[0.65rem] text-[#3b82f6]/50">/{entry.days}</span></div>
              <div className="font-syne text-sm text-center font-bold text-[#7c3aed]">{entry.saayam}<span className="text-[0.65rem] text-[#7c3aed]/50">/{entry.days}</span></div>
              <div className="font-syne font-bold text-sm text-saffron-600 text-center">{entry.completion}%</div>
            </div>
          )
        })}
        {hasMore && (
          <div className="px-6 py-3 text-center">
            <button className="px-5 py-2 bg-ink text-white border-none rounded-full font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] transition-colors disabled:bg-gray-300" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard list - Mobile cards */}
      <div className="md:hidden">
        <div className="font-syne text-[0.65rem] uppercase tracking-wider text-gray-400 mb-2">All Rankings</div>
        {leaderboard.length === 0 && (
          <div className="bg-white rounded-xl p-4 text-center text-gray-400 text-sm">No community data yet.</div>
        )}
        {leaderboard.map((entry, i) => {
          const isMe = entry.user_id === user?.id && !entry.parent_name
          const isMySon = entry.user_id === user?.id && !!entry.parent_name
          return (
            <div key={`${entry.user_id}-${entry.name}-${i}`} className={`bg-white rounded-xl p-2.5 px-3 shadow-sm mb-1 ${isMe || isMySon ? 'bg-saffron-50' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {entry.name}
                    {isMe && <span className="bg-saffron-500 text-white px-1.5 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider ml-1">You</span>}
                    {isMySon && <span className="bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-[0.52rem] font-bold font-syne uppercase tracking-wider ml-1">Son</span>}
                  </div>
                  {entry.parent_name && <div className="text-[0.6rem] text-gray-400 truncate">{entry.parent_name}&apos;s son</div>}
                </div>
                <div className="font-syne font-bold text-xs text-saffron-600 text-center min-w-[40px]">{entry.completion}%</div>
              </div>
              <div className="flex gap-3 text-[0.65rem] font-bold">
                <span className="text-gray-500">{entry.days}d</span>
                <span className="text-[#f59e0b]">P {entry.prathah}/{entry.days}</span>
                <span className="text-[#3b82f6]">M {entry.madhyahnika}/{entry.days}</span>
                <span className="text-[#7c3aed]">S {entry.saayam}/{entry.days}</span>
              </div>
            </div>
          )
        })}
        {hasMore && (
          <div className="text-center py-3">
            <button className="px-5 py-2 bg-ink text-white border-none rounded-full font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] transition-colors disabled:bg-gray-300" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}