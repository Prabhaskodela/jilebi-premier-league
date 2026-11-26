import { useCallback, useEffect, useRef, useState } from 'react'
import { Scene } from './Scene'
import { franchises, roomCode, type Franchise } from './data'
import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Player = { id: string; name: string; team: string; ready: boolean; host?: boolean }
type Room = { code: string; players: Player[]; phase: 'lobby' | 'match'; stadium: string; batting: string; bowling: string; runs: number; wickets: number; balls: number; message: string }
const id = () => Math.random().toString(36).slice(2, 10)
const stadiums = ['Wankhede', 'Chepauk', 'Eden Gardens', 'Chinnaswamy', 'Narendra Modi Stadium', 'Sawai Mansingh']
const blankRoom = (code: string, player: Player): Room => ({ code, players: [player], phase: 'lobby', stadium: stadiums[Math.floor(Math.random() * stadiums.length)], batting: 'CSK', bowling: 'MI', runs: 0, wickets: 0, balls: 0, message: 'Room is open. Bring your rivals.' })

export default function App() {
  const [name, setName] = useState(() => localStorage.getItem('jpl-name') || '')
  const [team, setTeam] = useState<Franchise>(franchises[0])
  const [room, setRoom] = useState<Room | null>(null)
  const [roomInput, setRoomInput] = useState('')
  const [notice, setNotice] = useState('')
  const [connected, setConnected] = useState(false)
  const [mode, setMode] = useState<'home' | 'teams' | 'lobby' | 'game'>('home')
  const [ball, setBall] = useState<[number, number, number]>([0, .55, -4])
  const [swing, setSwing] = useState(0)
  const [choice, setChoice] = useState<'bat' | 'bowl'>('bat')
  const [lastCall, setLastCall] = useState('READY')
  const channel = useRef<RealtimeChannel | null>(null)
  const roomRef = useRef<Room | null>(null)
  const deliveryRef = useRef<{ started: number; x: number; y: number; z: number; vx: number; vy: number; resolved: boolean } | null>(null)
  const playerId = useRef(localStorage.getItem('jpl-player-id') || id())
  localStorage.setItem('jpl-player-id', playerId.current)

  useEffect(() => { if (name) localStorage.setItem('jpl-name', name) }, [name])
  useEffect(() => () => { channel.current?.unsubscribe() }, [])
  useEffect(() => { roomRef.current = room }, [room])
  useEffect(() => {
    const query = new URLSearchParams(location.search).get('room')
    if (query) { setRoomInput(query.slice(0, 4).toUpperCase()); setMode('teams') }
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => {
      const delivery = deliveryRef.current
      if (!delivery || delivery.resolved) return
      const t = (performance.now() - delivery.started) / 1000
      const z = delivery.z + 13 * t
      const y = Math.max(.18, delivery.y + delivery.vy * t - 4.9 * t * t)
      const x = delivery.x + delivery.vx * t
      setBall([x, y, z])
      if (z >= 8) {
        delivery.resolved = true
        const wicket = Math.abs(x) < .48 && y < 1.6
        const current = roomRef.current
        if (current) {
          const next = { ...current, balls: current.balls + 1, wickets: current.wickets + (wicket ? 1 : 0), message: wicket ? 'Bowled! The stumps are rattled.' : 'A dot ball. Set the field again.' }
          roomRef.current = next; setRoom(next); void channel.current?.send({ type: 'broadcast', event: 'room-state', payload: next })
        }
        setLastCall(wicket ? 'WICKET · BOWLED' : 'DOT BALL · RESET')
        window.setTimeout(() => { setBall([0, .55, -4]); deliveryRef.current = null }, 450)
      }
    }, 45)
    return () => window.clearInterval(timer)
  }, [])

  const connectRoom = useCallback((initial: Room, isHost: boolean) => {
    channel.current?.unsubscribe()
    setRoom(initial); setMode('lobby'); setConnected(false)
    if (!supabase) { setNotice('Add your Supabase URL and publishable key to .env to turn on online rooms.'); return }
    const roomChannel = supabase.channel(`jpl-room-${initial.code}`, { config: { presence: { key: playerId.current }, broadcast: { self: false } } })
    channel.current = roomChannel
    roomChannel.on('presence', { event: 'sync' }, () => {
      const presence = roomChannel.presenceState<Player>()
      const players = Object.values(presence).flat().map(p => ({ ...p, host: initial.players[0]?.id === p.id }))
      setRoom(current => current ? { ...current, players } : current)
      if (isHost && roomRef.current) void roomChannel.send({ type: 'broadcast', event: 'room-state', payload: roomRef.current })
    }).on('broadcast', { event: 'room-state' }, ({ payload }) => {
      const shared = payload as Room; roomRef.current = shared; setRoom(shared)
      if (shared.phase === 'match') setMode('game')
    }).on('broadcast', { event: 'request-state' }, () => {
      if (isHost && roomRef.current) void roomChannel.send({ type: 'broadcast', event: 'room-state', payload: roomRef.current })
    })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
          await roomChannel.track({ id: playerId.current, name: name.trim() || 'Guest', team: team.code, ready: false, host: isHost })
          if (isHost) await roomChannel.send({ type: 'broadcast', event: 'room-state', payload: initial })
          else await roomChannel.send({ type: 'broadcast', event: 'request-state', payload: {} })
        }
      })
  }, [name, team])

  const createRoom = () => {
    const player = { id: playerId.current, name: name.trim() || 'Captain', team: team.code, ready: false, host: true }
    const newRoom = blankRoom(roomCode(), player); connectRoom(newRoom, true)
  }
  const joinRoom = () => {
    const code = roomInput.trim().toUpperCase()
    if (code.length !== 4) { setNotice('Enter a four character room code.'); return }
    const player = { id: playerId.current, name: name.trim() || 'Guest', team: team.code, ready: false }
    connectRoom(blankRoom(code, player), false)
  }
  const publishRoom = async (next: Room) => {
    setRoom(next); await channel.current?.send({ type: 'broadcast', event: 'room-state', payload: next })
  }
  const ready = async () => {
    if (!room) return
    const players = room.players.some(p => p.id === playerId.current)
      ? room.players.map(p => p.id === playerId.current ? { ...p, ready: !p.ready } : p)
      : [...room.players, { id: playerId.current, name: name.trim() || 'Guest', team: team.code, ready: true }]
    if (channel.current) await channel.current.track({ id: playerId.current, name: name.trim() || 'Guest', team: team.code, ready: !room.players.some(p => p.id === playerId.current && p.ready) })
    await publishRoom({ ...room, players })
  }
  const begin = async () => {
    if (!room) return
    const captain = room.players.find(p => p.host)
    if (captain && captain.id !== playerId.current) { setNotice('The room captain starts the match.'); return }
    await publishRoom({ ...room, phase: 'match', message: 'Play ball! First innings underway.' }); setMode('game')
  }
  const playBall = (shot: 'defend' | 'drive' | 'loft') => {
    if (!room) return
    if (choice === 'bowl') {
      if (deliveryRef.current) { setLastCall('BALL IS STILL IN PLAY'); return }
      const line = shot === 'defend' ? -.08 : shot === 'drive' ? .05 : .28
      deliveryRef.current = { started: performance.now(), x: line * -3, y: 2.2, z: -8, vx: line, vy: 1.2, resolved: false }
      setBall([line * -3, 2.2, -8]); setLastCall(`${shot.toUpperCase()} · DELIVERY IN`); setChoice('bat')
      return
    }
    const delivery = deliveryRef.current
    if (!delivery || delivery.resolved) { setLastCall('WAIT FOR THE DELIVERY'); return }
    const t = (performance.now() - delivery.started) / 1000
    const z = delivery.z + 13 * t
    const y = delivery.y + delivery.vy * t - 4.9 * t * t
    const x = delivery.x + delivery.vx * t
    if (z < 4.1 || z > 7.3 || y > 2.65 || y < .15) { setLastCall('TOO EARLY OR TOO LATE · BALL STILL LIVE'); return }
    delivery.resolved = true; setSwing(shot === 'drive' ? -.8 : shot === 'loft' ? -.55 : .25)
    const contact = Math.abs(x) < .9 ? 1 : .45
    const runs = shot === 'defend' ? (contact > .75 ? 1 : 0) : shot === 'drive' ? (contact > .75 ? 4 : 1) : (contact > .75 ? 6 : 2)
    setBall([x + (shot === 'loft' ? 4 : shot === 'drive' ? 1.8 : .2), shot === 'loft' ? 6 : shot === 'drive' ? 2.2 : .5, 15])
    const next = { ...room, runs: room.runs + runs, balls: room.balls + 1, message: runs === 6 ? 'SIX! Picked it up and cleared the rope.' : runs === 4 ? 'FOUR! Driven through the covers.' : runs ? `${runs} run${runs > 1 ? 's' : ''}. Good running.` : 'Defended back to the bowler.' }
    roomRef.current = next; setRoom(next); void channel.current?.send({ type: 'broadcast', event: 'room-state', payload: next })
    setLastCall(next.message); setChoice('bowl')
    window.setTimeout(() => { setBall([0, .55, -4]); setSwing(0); deliveryRef.current = null }, 950)
  }

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#home" onClick={e => { e.preventDefault(); setMode('home') }}><span className="brand-mark">J<span>•</span></span><span>JILEBI <b>PREMIER LEAGUE</b></span></a><div className="top-right"><span className="season">SEASON 01 <i /></span><button className="profile-button" onClick={() => document.getElementById('player-name')?.focus()}>{name.slice(0, 1).toUpperCase() || 'P'}</button></div></header>

    {mode === 'home' && <section className="home-screen" id="home"><div className="hero-scene"><Scene ball={[0, .55, -4]} swing={0} /><div className="hero-vignette" /><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> PRIVATE MATCHES · LIVE CRICKET</div><h1>THIS IS<br /><em>YOUR</em> LEAGUE.</h1><p>Your friends. Your franchise. Your cricket chaos.</p><div className="hero-actions"><button className="primary-button" onClick={() => setMode('teams')}>PLAY NOW <span>↗</span></button><button className="secondary-button" onClick={() => setMode('teams')}>HOW TO PLAY <span>↓</span></button></div></div><div className="ground-label">NIGHT MATCH <span>·</span> INDIA</div><div className="hero-score"><small>THE FIRST BALL</small><b>IS YOURS</b><span>10 FRANCHISES · YOUR RULES</span></div></div><div className="home-footer"><div><small>01 / PICK YOUR SIDE</small><b>Choose a franchise</b></div><div><small>02 / CALL YOUR CREW</small><b>Make a room or join one</b></div><div><small>03 / TAKE THE FIELD</small><b>Bat, bowl, and talk big</b></div><div className="footer-tagline">NO CONTRACTS.<br /><strong>JUST CRICKET.</strong></div></div></section>}

    {mode === 'teams' && <section className="selection-screen"><div className="screen-kicker">THE DRAFT ROOM <span>·</span> SEASON 01</div><h1>Pick your<br /><em>colours.</em></h1><p className="section-intro">Ten cities. One trophy. Choose the shirt you want to sweat in.</p><label className="name-field">PLAYER NAME <input id="player-name" placeholder="What do we call you?" maxLength={20} value={name} onChange={e => setName(e.target.value)} /></label><div className="team-grid">{franchises.map((franchise, index) => <button key={franchise.code} className={`team-card ${team.code === franchise.code ? 'selected' : ''}`} style={{ '--team': franchise.colors[0], '--team2': franchise.colors[1] } as React.CSSProperties} onClick={() => setTeam(franchise)}><span className="team-number">{String(index + 1).padStart(2, '0')}</span><span className="team-badge">{franchise.code.slice(0, 1)}</span><span className="team-name">{franchise.name}</span><span className="team-city">{franchise.city}</span><span className="team-check">{team.code === franchise.code ? '✓' : '↗'}</span></button>)}</div><div className="team-cta"><button className="text-button" onClick={() => setMode('home')}>← BACK</button><button className="primary-button" onClick={createRoom}>CREATE A ROOM <span>↗</span></button></div><div className="join-strip"><span>GOT AN INVITE?</span><input aria-label="Room code" placeholder="ENTER CODE" maxLength={4} value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase())} /><button onClick={joinRoom}>JOIN ROOM ↗</button></div></section>}

    {mode === 'lobby' && room && <section className="lobby-screen"><div className="lobby-head"><div><div className="screen-kicker">PRIVATE ROOM <span>·</span> {connected ? 'ONLINE' : 'CONNECTING'}</div><h1>THE <em>HANGAR.</em></h1></div><div className="room-code-block"><small>ROOM CODE</small><b>{room.code}</b><button onClick={() => navigator.clipboard?.writeText(`${location.origin}/?room=${room.code}`)}>COPY INVITE ↗</button></div></div><div className="lobby-grid"><div className="roster-panel"><div className="panel-title">THE LINEUP <span>{room.players.length} / 10</span></div>{room.players.map(player => { const franchise = franchises.find(f => f.code === player.team) || franchises[0]; return <div className="roster-player" key={player.id}><span className="roster-crest" style={{ background: franchise.colors[0], color: franchise.colors[1] }}>{player.team}</span><span><b>{player.name}{player.id === playerId.current ? ' (YOU)' : ''}</b><small>{franchise.city} {player.host ? '· CAPTAIN' : ''}</small></span><i className={player.ready ? 'ready' : ''}>{player.ready ? 'READY' : 'PICKING KIT'}</i></div> })}{room.players.length === 1 && <div className="empty-slot"><span>+</span>Waiting for your crew</div>}<button className="primary-button lobby-ready" onClick={ready}>I'M READY <span>✓</span></button>{room.players.some(p => p.host && p.id === playerId.current) && <button className="secondary-button start-match" onClick={begin}>START MATCH ↗</button>}</div><div className="match-preview"><Scene ball={ball} swing={swing} /><div className="preview-overlay"><small>TONIGHT'S GROUND</small><b>{room.stadium}</b><span>4 OVERS <i>·</i> CLASSIC</span></div><button className="change-ground" onClick={() => setRoom({ ...room, stadium: stadiums[(stadiums.indexOf(room.stadium) + 1) % stadiums.length] })}>REROLL GROUND ↻</button></div></div><button className="text-button back-lobby" onClick={() => { channel.current?.unsubscribe(); setRoom(null); setMode('teams') }}>← LEAVE ROOM</button></section>}

    {mode === 'game' && room && <section className="game-screen"><div className="match-topline"><span><i className="live-dot" /> LIVE MATCH</span><span>{room.stadium.toUpperCase()} <i>·</i> 4 OVER MATCH</span><button onClick={() => { channel.current?.unsubscribe(); setMode('lobby') }}>ROOM {room.code} ↗</button></div><div className="game-canvas"><Scene ball={ball} swing={swing} /><div className="game-vignette" /><div className="scorebug"><div className="batting-team"><small>{room.batting} BATTING</small><b>{room.runs}<span>/{room.wickets}</span></b></div><div className="overs"><small>OVERS</small><b>{Math.floor(room.balls / 6)}.{room.balls % 6}</b></div><div className="target"><small>INNINGS 1</small><b>4 OVERS</b></div><div className="score-message">{room.message}</div></div><div className="game-prompt"><span>YOU'RE UP</span><b>{choice === 'bat' ? 'READ THE DELIVERY.' : 'SET THE LINE.'}</b></div><div className="game-controls"><div className="mode-toggle"><button className={choice === 'bat' ? 'on' : ''} onClick={() => setChoice('bat')}>BAT</button><button className={choice === 'bowl' ? 'on' : ''} onClick={() => setChoice('bowl')}>BOWL</button></div><div className="shot-buttons">{(choice === 'bat' ? [['DEFEND', 'defend'], ['DRIVE', 'drive'], ['LOFT', 'loft']] : [['SLOW', 'defend'], ['FAST', 'drive'], ['YORKER', 'loft']]).map(([label, shot]) => <button key={label} onClick={() => playBall(shot as 'defend' | 'drive' | 'loft')}><span>{label}</span><small>{choice === 'bowl' ? 'DELIVER' : 'SHOT'}</small></button>)}</div><button className="run-button" onClick={() => setLastCall('RUNNING CONTROL COMING NEXT')}>RUN <span>⇧</span></button></div><div className="match-call">{lastCall}</div></div><div className="game-bottom"><span>TIME YOUR SHOT <i>·</i> READ THE BALL</span><span>TEAM {team.code} <i>·</i> {room.players.length} IN THE ROOM</span><button onClick={() => setMode('lobby')}>MATCH MENU ↗</button></div></section>}

    {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
    {!supabase && <div className="offline-pill"><i /> LOCAL PREVIEW · CONNECT SUPABASE FOR MULTIPLAYER</div>}
  </main>
}

