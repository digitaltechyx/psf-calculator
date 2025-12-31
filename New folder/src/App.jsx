import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import './App.css'

// Fluid Cursor Effect
const FluidCursor = () => {
  const cursorRef = useRef(null)
  const cursorFollowerRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`
        cursorRef.current.style.top = `${e.clientY}px`
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  const cursorX = useSpring(useMotionValue(mousePosition.x), { stiffness: 150, damping: 15 })
  const cursorY = useSpring(useMotionValue(mousePosition.y), { stiffness: 150, damping: 15 })
  
  return (
    <>
      <motion.div
        ref={cursorRef}
        className="cursor-dot"
        style={{
          x: cursorX,
          y: cursorY,
        }}
      />
      <motion.div
        ref={cursorFollowerRef}
        className="cursor-follower"
        style={{
          x: cursorX,
          y: cursorY,
        }}
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </>
  )
}

// Canvas-based Fireworks (streaks + trails + gravity + additive glow)
const FireworksCanvas = ({ clickPosition }) => {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const lastTRef = useRef(0)
  const entitiesRef = useRef([]) // rockets + sparks
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  const schemesRef = useRef([
    ['#FF6B6B', '#FFD93D', '#FFA07A'],
    ['#4ECDC4', '#45B7D1', '#87CEEB'],
    ['#BB8FCE', '#9370DB', '#DA70D6'],
    ['#F7DC6F', '#FFD700', '#FFA500'],
    ['#6BCF7F', '#98D8C8', '#90EE90'],
    ['#FF6B9D', '#FF69B4', '#FF1493'],
  ])

  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    sizeRef.current = { w, h, dpr }
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }

  const explode = (x, y, scheme) => {
    const entities = entitiesRef.current
    const gravity = 520

    const outerCount = 140 // Slightly reduced for smoother performance
    for (let i = 0; i < outerCount; i++) {
      const angle = (Math.PI * 2 * i) / outerCount + (Math.random() - 0.5) * 0.1
      const speed = 180 + Math.random() * 260
      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed
      const color = scheme[Math.floor(Math.random() * scheme.length)]
      entities.push({
        type: 'spark',
        x,
        y,
        px: x,
        py: y,
        vx,
        vy,
        gravity,
        drag: 0.986 - Math.random() * 0.008, // Smoother drag
        ttl: 1.8 + Math.random() * 0.9,
        life: 0,
        width: 1.0 + Math.random() * 1.8,
        color,
        glow: 1.2 + Math.random() * 1.5,
        glitter: Math.random() < 0.25,
      })
    }

    const innerCount = 45 // Slightly reduced
    for (let i = 0; i < innerCount; i++) {
      const angle = (Math.PI * 2 * i) / innerCount
      const speed = 80 + Math.random() * 130
      const color = scheme[Math.floor(Math.random() * scheme.length)]
      entities.push({
        type: 'spark',
        x,
        y,
        px: x,
        py: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 400,
        drag: 0.975,
        ttl: 1.0 + Math.random() * 0.5,
        life: 0,
        width: 1.3 + Math.random() * 1.9,
        color,
        glow: 1.7 + Math.random() * 2.2,
        glitter: false,
      })
    }
  }

  const spawnFirework = (x, y) => {
    const scheme =
      schemesRef.current[Math.floor(Math.random() * schemesRef.current.length)]

    const targetY = Math.max(80, y - (180 + Math.random() * 240))
    const vx = (Math.random() - 0.5) * 50
    const vy = -(520 + Math.random() * 220)

    entitiesRef.current.push({
      type: 'rocket',
      x,
      y,
      px: x,
      py: y,
      vx,
      vy,
      targetY,
      scheme,
      life: 1.25,
    })

    if (Math.random() < 0.35) {
      entitiesRef.current.push({
        type: 'rocket',
        x: x + (Math.random() - 0.5) * 140,
        y,
        px: x,
        py: y,
        vx: (Math.random() - 0.5) * 70,
        vy: -(480 + Math.random() * 260),
        targetY: Math.max(80, y - (160 + Math.random() * 280)),
        scheme,
        life: 1.25,
      })
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    resize()
    window.addEventListener('resize', resize)

    const tick = (t) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d', { willReadFrequently: false })
      if (!canvas || !ctx) return

      const { w, h, dpr } = sizeRef.current
      const delta = t - (lastTRef.current || t)
      lastTRef.current = t
      const dt = Math.min(delta / 1000, 0.02) // Cap at 20ms for smoother animation

      ctx.save()
      ctx.scale(dpr, dpr)

      // Smoother fade for trails
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(5, 10, 15, 0.12)' // Lighter fade for smoother trails
      ctx.fillRect(0, 0, w, h)

      // Additive glow drawing
      ctx.globalCompositeOperation = 'lighter'

      const entities = entitiesRef.current
      for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i]

        if (e.type === 'rocket') {
          e.life -= dt
          e.px = e.x
          e.py = e.y
          e.vy += 220 * dt
          e.x += e.vx * dt
          e.y += e.vy * dt

          const c = e.scheme[0]
          const dx = e.x - e.px
          const dy = e.y - e.py
          const dist = Math.hypot(dx, dy)
          
          // Smoother gradient trail
          if (dist > 0.1) {
            const grad = ctx.createLinearGradient(e.x, e.y, e.x - dx * 12, e.y - dy * 12)
            grad.addColorStop(0, c)
            grad.addColorStop(0.3, c + 'CC')
            grad.addColorStop(0.7, c + '66')
            grad.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.strokeStyle = grad
            ctx.lineWidth = 2.5
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(e.x, e.y)
            ctx.lineTo(e.x - dx * 12, e.y - dy * 12)
            ctx.stroke()
          }

          // Smoother rocket core with better glow
          ctx.fillStyle = c
          ctx.shadowColor = c
          ctx.shadowBlur = 24
          ctx.beginPath()
          ctx.arc(e.x, e.y, 2.4, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          if (e.y <= e.targetY || e.vy >= 0 || e.life <= 0) {
            explode(e.x, e.y, e.scheme)
            entities.splice(i, 1)
          }
          continue
        }

        if (e.type === 'spark') {
          e.life += dt
          const k = e.life / e.ttl
          if (k >= 1) {
            entities.splice(i, 1)
            continue
          }

          e.px = e.x
          e.py = e.y

          // Smoother physics with better drag calculation
          const drag = Math.pow(e.drag, dt * 60)
          e.vx *= drag
          e.vy *= drag
          e.vy += e.gravity * dt
          e.x += e.vx * dt
          e.y += e.vy * dt

          // Smooth alpha fade with easing
          const alpha = Math.pow(1 - k, 1.5) // Ease out for smoother fade
          const lw = e.width * (0.7 + alpha * 0.3) // Slight size fade

          // Smoother trail rendering
          const dx = e.x - e.px
          const dy = e.y - e.py
          const dist = Math.hypot(dx, dy)
          
          if (dist > 0.1) {
            ctx.lineWidth = lw
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.strokeStyle = e.color
            ctx.shadowColor = e.color
            ctx.shadowBlur = 20 * e.glow * alpha

            ctx.beginPath()
            ctx.moveTo(e.px, e.py)
            ctx.lineTo(e.x, e.y)
            ctx.stroke()
          }

          // Smoother head glow with better blending
          ctx.fillStyle = `rgba(255,255,255,${0.15 * alpha})`
          ctx.shadowColor = e.color
          ctx.shadowBlur = 12 * alpha
          ctx.beginPath()
          ctx.arc(e.x, e.y, lw * 0.9, 0, Math.PI * 2)
          ctx.fill()

          ctx.shadowBlur = 0

          // Glitter sub-sparks (reduced frequency for smoother performance)
          if (e.glitter && Math.random() < 0.18) {
            entities.push({
              type: 'spark',
              x: e.x,
              y: e.y,
              px: e.x,
              py: e.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              gravity: 480,
              drag: 0.92,
              ttl: 0.3 + Math.random() * 0.2,
              life: 0,
              width: 0.6 + Math.random() * 0.7,
              color: e.color,
              glow: 1.0,
              glitter: false,
            })
          }
        }
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!clickPosition) return
    spawnFirework(clickPosition.x, clickPosition.y)
  }, [clickPosition])

  return <canvas ref={canvasRef} className="fireworks-canvas" />
}

// Snowflakes Component
const Snowflakes = () => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080
  
  const snowflakes = Array.from({ length: 100 })
  
  return (
    <div className="snowflakes-container">
      {snowflakes.map((_, i) => {
        const size = 2 + Math.random() * 4
        const duration = 10 + Math.random() * 15
        const delay = Math.random() * 10
        const x = Math.random() * width
        const wind = (Math.random() - 0.5) * 50
        
        return (
          <motion.div
            key={i}
            className="snowflake"
            initial={{
              x: x,
              y: -50,
              opacity: 0,
            }}
            animate={{
              y: height + 100,
              x: x + wind,
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              width: size,
              height: size,
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3))',
              boxShadow: `0 0 ${size * 2}px rgba(255, 255, 255, 0.8)`,
              borderRadius: '50%',
            }}
          />
        )
      })}
    </div>
  )
}

// Winter Aurora
const WinterAurora = () => {
  return (
    <div className="winter-aurora">
      <motion.div
        className="aurora-wave aurora-1"
        animate={{
          x: ['-100%', '100%', '-100%'],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="aurora-wave aurora-2"
        animate={{
          x: ['100%', '-100%', '100%'],
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3
        }}
      />
      <motion.div
        className="aurora-wave aurora-3"
        animate={{
          x: ['-80%', '80%', '-80%'],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 6
        }}
      />
    </div>
  )
}

// Ice Particles
const IceParticles = () => {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080
  
  return (
    <div className="ice-particles">
      {Array.from({ length: 80 }).map((_, i) => {
        const size = 1 + Math.random() * 3
        const duration = 15 + Math.random() * 10
        const delay = Math.random() * 8
        
        return (
          <motion.div
            key={i}
            className="ice-particle"
            initial={{
              x: Math.random() * width,
              y: height + 50,
              opacity: 0,
            }}
            animate={{
              y: -100,
              x: (Math.random() - 0.5) * 150,
              opacity: [0, 0.6, 0.6, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              width: size,
              height: size,
              background: `radial-gradient(circle, 
                rgba(173, 216, 230, 0.9), 
                rgba(135, 206, 250, 0.4))`,
              boxShadow: `0 0 ${size * 3}px rgba(173, 216, 230, 0.7)`,
            }}
          />
        )
      })}
    </div>
  )
}

// Smooth Text Reveal
const SmoothText = ({ children, delay = 0, className = '' }) => {
  const words = children.split(' ')
  
  return (
    <div className={`smooth-text ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="word">
          {word.split('').map((char, j) => (
            <motion.span
              key={j}
              className="char"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: delay + (i * 0.08) + (j * 0.02),
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
          {i < words.length - 1 && <span className="space"> </span>}
        </span>
      ))}
    </div>
  )
}

// Winter Year Display
const WinterYear = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20
        setMousePosition({ x, y })
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const rotateX = useSpring(useMotionValue(mousePosition.y), { stiffness: 40, damping: 20 })
  const rotateY = useSpring(useMotionValue(mousePosition.x), { stiffness: 40, damping: 20 })

  return (
    <div ref={containerRef} className="winter-year-container">
      <motion.div
        className="winter-year"
        style={{
          rotateX,
          rotateY,
        }}
        animate={{
          scale: [1, 1.03, 1],
        }}
        transition={{
          scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        {['2', '0', '2', '6'].map((digit, i) => (
          <motion.div
            key={i}
            className="winter-digit"
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.8 + i * 0.12,
              type: "spring",
              stiffness: 120,
              damping: 15
            }}
            whileHover={{ scale: 1.08, y: -5 }}
          >
            {digit}
            <motion.div
              className="digit-glow"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// Glowing Orbs
const GlowingOrbs = () => {
  const orbs = [
    { size: 300, x: '15%', y: '25%', delay: 0 },
    { size: 250, x: '80%', y: '60%', delay: 2 },
    { size: 200, x: '50%', y: '80%', delay: 4 },
  ]
  
  return (
    <div className="glowing-orbs">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="glowing-orb"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay
          }}
        />
      ))}
    </div>
  )
}

function App() {
  const [clickPosition, setClickPosition] = useState(null)
  const [hasClicked, setHasClicked] = useState(false)
  
  const handleClick = (e) => {
    setClickPosition({ x: e.clientX, y: e.clientY })
    setHasClicked(true)
  }
  
  return (
    <div className="app" onClick={handleClick}>
      <div className="winter-background"></div>
      <WinterAurora />
      <GlowingOrbs />
      <Snowflakes />
      <IceParticles />
      <FireworksCanvas clickPosition={clickPosition} />
      <FluidCursor />
      
      <div className="content-wrapper">
        <motion.div
          className="main-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          {/* Main Greeting */}
          <div className="greeting-section">
            <SmoothText delay={0.8} className="main-greeting">
              Happy New Year
            </SmoothText>
            
            <WinterYear />
          </div>
          
          {/* Click Hint */}
          {!hasClicked && (
            <motion.div
              className="click-hint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.8 }}
            >
              <motion.span
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Click anywhere for fireworks 🎆
              </motion.span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default App
