'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cricketPlayers, type Player } from '@/data/players'

interface SoldPlayer extends Player { soldPrice?: number }
interface Team {
  id: number
  name: string
  budget: number
  players: SoldPlayer[]
  color: string
}

interface AuctionState {
  currentPlayer: Player | null
  currentBid: number
  currentBidder: number | null
  isActive: boolean
  timeLeft: number
  completedPlayers: Player[]
  availablePlayers: Player[]
}

export default function AuctionPage(){
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading auction...</div>}>
      <AuctionInner />
    </Suspense>
  )
}

function AuctionInner(){
  const searchParams = useSearchParams()
  const plan = searchParams?.get('plan') || 'free'
  const maxTeams = plan === 'premium' ? 4 : 2

  // Team setup
  const [teams, setTeams] = useState<Team[]>([
    { id: 1, name: 'Mumbai Warriors', budget: 800000, players: [], color: 'bg-blue-500' },
    { id: 2, name: 'Delhi Defenders', budget: 800000, players: [], color: 'bg-red-500' },
    { id: 3, name: 'Chennai Champions', budget: 800000, players: [], color: 'bg-yellow-500' },
    { id: 4, name: 'Kolkata Knights', budget: 800000, players: [], color: 'bg-purple-500' }
  ].slice(0, maxTeams))

  // Auction state
  const [auction, setAuction] = useState<AuctionState>({
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    isActive: false,
    timeLeft: 30,
    completedPlayers: [],
    availablePlayers: [...cricketPlayers]
  })

  const [showStats, setShowStats] = useState(false)
  const [auctionStarted, setAuctionStarted] = useState(false)

  const handlePlayerSold = useCallback(() => {
    setAuction(prevAuction => {
      if (!prevAuction.currentPlayer) return prevAuction
      const currentPlayer: Player = prevAuction.currentPlayer // narrow
      const highest = prevAuction.currentBidder
      if (highest) {
        setTeams(prevTeams => prevTeams.map(team =>
          team.id === highest
            ? { ...team, players: [...team.players, { ...currentPlayer, soldPrice: prevAuction.currentBid }], budget: team.budget - prevAuction.currentBid }
            : team
        ))
      }
      return {
        ...prevAuction,
        completedPlayers: [...prevAuction.completedPlayers, currentPlayer],
        currentPlayer: null,
        currentBid: 0,
        currentBidder: null,
        isActive: false,
        timeLeft: 30
      }
    })
  }, [])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (auction.isActive && auction.timeLeft > 0) {
      interval = setInterval(() => {
        setAuction(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }))
      }, 1000)
    } else if (auction.timeLeft === 0 && auction.isActive) {
      handlePlayerSold()
    }
    return () => { if(interval) clearInterval(interval) }
  }, [auction.isActive, auction.timeLeft, handlePlayerSold])

  const startAuction = () => {
    if (auction.availablePlayers.length === 0) return
    
    const randomPlayer = auction.availablePlayers[Math.floor(Math.random() * auction.availablePlayers.length)]
    
    setAuction(prev => ({
      ...prev,
      currentPlayer: randomPlayer,
      currentBid: randomPlayer.basePrice,
      currentBidder: null,
      isActive: true,
      timeLeft: 30,
      availablePlayers: prev.availablePlayers.filter(p => p.id !== randomPlayer.id)
    }))
    setAuctionStarted(true)
  }

  const placeBid = (teamId: number) => {
    if (!auction.isActive || !auction.currentPlayer) return
    
    const team = teams.find(t => t.id === teamId)
    if (!team) return
    
    const newBid = auction.currentBid + 25000
    if (newBid > team.budget) {
      alert(`${team.name} doesn't have enough budget!`)
      return
    }
    
    setAuction(prev => ({
      ...prev,
      currentBid: newBid,
      currentBidder: teamId,
      timeLeft: 15 // Reset timer on new bid
    }))
  }

  const skipPlayer = () => {
    if (!auction.currentPlayer) return
    
    setAuction(prev => ({
      ...prev,
      completedPlayers: [...prev.completedPlayers, prev.currentPlayer!],
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null,
      isActive: false,
      timeLeft: 30
    }))
  }

  const getTimerColor = () => {
    if (auction.timeLeft <= 10) return 'text-red-400'
    if (auction.timeLeft <= 20) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getTeamButtonStyle = (team: Team) => {
    if (auction.currentBidder === team.id) {
      return 'bg-green-500 text-white'
    }
    if (team.budget >= (auction.currentBid + 25000)) {
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    }
    return 'bg-gray-100 text-gray-400 cursor-not-allowed'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getPlayerStats = () => {
    const totalPlayers = teams.reduce((sum, team) => sum + team.players.length, 0)
    const remainingPlayers = cricketPlayers.length - auction.completedPlayers.length
    const totalSpent = teams.reduce((sum, team) => sum + (800000 - team.budget), 0)
    
    return { totalPlayers, remainingPlayers, totalSpent }
  }

  const stats = getPlayerStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-lg shadow-xl border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-white hover:text-yellow-400 transition-colors">
                🏏 Cricket Auction
              </Link>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg"
              >
                {plan === 'premium' ? '⭐ Premium' : '🆓 Free'} Plan
              </motion.span>
            </div>
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowStats(!showStats)}
                className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/30"
              >
                {showStats ? '📊 Hide Stats' : '📈 Show Stats'}
              </motion.button>
              {plan === 'free' && (
                <Link 
                  href="/pricing"
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all font-semibold shadow-lg"
                >
                  ⚡ Upgrade to Premium
                </Link>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Panel */}
        <AnimatePresence>
          {showStats && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-8 border border-white/20"
            >
              <h2 className="text-2xl font-bold text-white mb-6 text-center">📊 Live Auction Statistics</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <motion.div 
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/30 rounded-xl border border-blue-300/30 backdrop-blur-sm"
                >
                  <div className="text-4xl font-bold text-blue-300 mb-2">{stats.totalPlayers}</div>
                  <div className="text-blue-100 font-medium">🏏 Players Sold</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  className="text-center p-6 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-xl border border-green-300/30 backdrop-blur-sm"
                >
                  <div className="text-4xl font-bold text-green-300 mb-2">{stats.remainingPlayers}</div>
                  <div className="text-green-100 font-medium">⏳ Players Remaining</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  className="text-center p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/30 rounded-xl border border-purple-300/30 backdrop-blur-sm"
                >
                  <div className="text-4xl font-bold text-purple-300 mb-2">{formatCurrency(stats.totalSpent)}</div>
                  <div className="text-purple-100 font-medium">💰 Total Spent</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05, rotateY: 5 }}
                  className="text-center p-6 bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 rounded-xl border border-yellow-300/30 backdrop-blur-sm"
                >
                  <div className="text-4xl font-bold text-yellow-300 mb-2">{maxTeams}</div>
                  <div className="text-yellow-100 font-medium">👥 Active Teams</div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Auction */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 mb-8 border border-white/20"
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-4">
              🏏 Cricket Player Auction 🏏
            </h1>
            <p className="text-blue-100 text-lg">Build your dream team with {maxTeams} teams and ₹8,00,000 budget each</p>
          </motion.div>

          {!auctionStarted ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                whileTap={{ scale: 0.95 }}
                onClick={startAuction}
                disabled={auction.availablePlayers.length === 0}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-12 py-6 rounded-2xl font-bold hover:from-green-600 hover:to-blue-700 transition-all text-xl disabled:from-gray-400 disabled:to-gray-500 shadow-2xl"
              >
                {auction.availablePlayers.length === 0 ? '🏆 Auction Complete' : '🚀 Start Auction'}
              </motion.button>
            </motion.div>
          ) : (
            <>
              {auction.currentPlayer ? (
                <motion.div 
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="grid md:grid-cols-2 gap-8"
                >
                  {/* Player Card */}
                  <motion.div 
                    whileHover={{ scale: 1.02, rotateY: 5 }}
                    className="bg-gradient-to-br from-yellow-400/20 via-red-500/20 to-pink-500/20 p-8 rounded-2xl backdrop-blur-sm border border-white/30 shadow-2xl"
                  >
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-center mb-6"
                    >
                      <motion.h2 
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="text-3xl font-bold text-white mb-3 drop-shadow-lg"
                      >
                        🌟 {auction.currentPlayer.name} 🌟
                      </motion.h2>
                      <div className="flex justify-center items-center space-x-4 text-sm mb-6">
                        <motion.span 
                          whileHover={{ scale: 1.1 }}
                          className="bg-blue-500/80 text-white px-3 py-2 rounded-full font-semibold shadow-lg"
                        >
                          🏴 {auction.currentPlayer.country}
                        </motion.span>
                        <motion.span 
                          whileHover={{ scale: 1.1 }}
                          className="bg-green-500/80 text-white px-3 py-2 rounded-full font-semibold shadow-lg"
                        >
                          🏏 {auction.currentPlayer.role}
                        </motion.span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-center">
                          <span className="font-bold text-yellow-300">⭐ Rating:</span>
                          <div className="text-white font-bold text-lg">{auction.currentPlayer.rating}/100</div>
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-blue-300">🕒 Experience:</span>
                          <div className="text-white font-bold text-lg">{auction.currentPlayer.experience} years</div>
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-green-300">🏏 Batting:</span>
                          <div className="text-white font-semibold">{auction.currentPlayer.battingStyle}</div>
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-red-300">⚡ Bowling:</span>
                          <div className="text-white font-semibold">{auction.currentPlayer.bowlingStyle}</div>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="font-bold text-purple-300">🎯 Speciality:</span>
                          <div className="text-white font-semibold">{auction.currentPlayer.speciality}</div>
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* Timer */}
                    <motion.div 
                      animate={{ 
                        scale: auction.timeLeft <= 10 ? [1, 1.1, 1] : 1,
                        rotate: auction.timeLeft <= 5 ? [0, 5, -5, 0] : 0
                      }}
                      transition={{ 
                        scale: { repeat: auction.timeLeft <= 10 ? Infinity : 0, duration: 0.5 },
                        rotate: { repeat: auction.timeLeft <= 5 ? Infinity : 0, duration: 0.2 }
                      }}
                      className="text-center"
                    >
                      <div className={`text-6xl font-bold mb-2 drop-shadow-2xl ${getTimerColor()}`}>
                        ⏰ {auction.timeLeft}s
                      </div>
                      <div className="text-white/80 font-semibold">Time Remaining</div>
                    </motion.div>
                  </motion.div>

                  {/* Bidding Panel */}
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20"
                  >
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="text-center mb-6"
                    >
                      <motion.div 
                        animate={{ 
                          scale: auction.currentBidder ? [1, 1.1, 1] : 1 
                        }}
                        transition={{ 
                          repeat: auction.currentBidder ? 3 : 0, 
                          duration: 0.3 
                        }}
                        className="text-4xl font-bold text-green-400 mb-2 drop-shadow-lg"
                      >
                        💰 {formatCurrency(auction.currentBid)}
                      </motion.div>
                      <div className="text-white/80 text-sm">
                        {auction.currentBidder 
                          ? `🔥 Highest bid by ${teams.find(t => t.id === auction.currentBidder)?.name}`
                          : `💵 Base price: ${formatCurrency(auction.currentPlayer.basePrice)}`
                        }
                      </div>
                    </motion.div>

                    {/* Team Bidding Buttons */}
                    <div className="space-y-3 mb-6">
                      {teams.map((team, index) => (
                        <motion.button
                          key={team.id}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          whileHover={{ 
                            scale: team.budget >= (auction.currentBid + 25000) ? 1.02 : 1,
                            x: team.budget >= (auction.currentBid + 25000) ? 5 : 0
                          }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => placeBid(team.id)}
                          disabled={!auction.isActive || (auction.currentBid + 25000) > team.budget}
                          className={`w-full p-4 rounded-xl font-semibold transition-all duration-200 ${getTeamButtonStyle(team)} border border-white/20 backdrop-blur-sm`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="flex items-center">
                              {auction.currentBidder === team.id && <span className="mr-2">🔥</span>}
                              {team.name}
                            </span>
                            <span className="text-sm">💰 {formatCurrency(team.budget)}</span>
                          </div>
                          {team.budget >= (auction.currentBid + 25000) && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm mt-1 text-yellow-200"
                            >
                              Next Bid: {formatCurrency(auction.currentBid + 25000)}
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePlayerSold}
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                      >
                        🔨 Sell Now
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={skipPlayer}
                        className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all shadow-lg"
                      >
                        ⏭️ Skip Player
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="text-center">
                  <button
                    onClick={startAuction}
                    disabled={auction.availablePlayers.length === 0}
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg disabled:bg-gray-400"
                  >
                    {auction.availablePlayers.length === 0 ? 'Auction Complete' : 'Next Player'}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Teams Display */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {teams.map((team, index) => (
            <motion.div 
              key={team.id}
              initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.9 + index * 0.1, type: "spring" }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-white/20"
            >
              <motion.div 
                className={`${team.color} p-6 text-white relative overflow-hidden`}
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="relative z-10">
                  <h3 className="font-bold text-xl mb-2 drop-shadow-lg">🏆 {team.name}</h3>
                  <p className="text-sm opacity-90 font-semibold">💰 Budget: {formatCurrency(team.budget)}</p>
                  <p className="text-sm opacity-90 font-semibold">👥 Players: {team.players.length}</p>
                </div>
              </motion.div>
              <div className="p-6">
                {team.players.length === 0 ? (
                  <p className="text-white/60 text-sm text-center py-4">⏳ No players yet</p>
                ) : (
                  <div className="space-y-3">
                    {team.players.map((player) => (
                      <motion.div 
                        key={player.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        whileHover={{ x: 5, scale: 1.02 }}
                        className="flex justify-between items-center text-sm bg-white/10 rounded-lg p-3 backdrop-blur-sm border border-white/20"
                      >
                        <span className="font-medium text-white">🌟 {player.name}</span>
                        <span className="text-green-400 font-bold">{formatCurrency((player as any).soldPrice)}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Auction Complete */}
        <AnimatePresence>
          {auction.availablePlayers.length === 0 && auctionStarted && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                rotateZ: [0, 1, -1, 0]
              }}
              transition={{ 
                duration: 0.8, 
                type: "spring",
                rotateZ: { repeat: 3, duration: 0.3 }
              }}
              className="bg-gradient-to-r from-yellow-400/20 via-red-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl shadow-2xl p-8 mt-8 text-center border border-white/30"
            >
              <motion.h2 
                animate={{ 
                  scale: [1, 1.1, 1], 
                  rotate: [0, 5, -5, 0] 
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2 
                }}
                className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent mb-6"
              >
                🎉🏆 AUCTION COMPLETE! 🏆🎉
              </motion.h2>
              <p className="text-white/80 mb-8 text-lg">All players have been allocated to teams! The auction was amazing! 🚀</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all shadow-2xl"
                >
                  🔄 Start New Auction
                </motion.button>
                {plan === 'free' && (
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link 
                      href="/pricing"
                      className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-8 py-4 rounded-xl font-bold hover:from-green-600 hover:to-teal-700 transition-all shadow-2xl block"
                    >
                      ⚡ Upgrade for More Features
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
