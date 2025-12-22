import { Outlet } from 'react-router-dom'
import { Navigation } from './Navigation'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NotificationBell } from './NotificationBell'

const Snowflake = ({ style }: { style: React.CSSProperties }) => (
  <div
    className="absolute text-white opacity-80 pointer-events-none animate-snowfall"
    style={style}
  >
    ❄
  </div>
)

export const Layout = () => {
  const { employee, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([])

  useEffect(() => {
    const flakes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 10,
    }))
    setSnowflakes(flakes)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 relative overflow-hidden">
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
        .animate-snowfall {
          animation: snowfall linear infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>

      {snowflakes.map((flake) => (
        <Snowflake
          key={flake.id}
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${12 + Math.random() * 8}px`,
          }}
        />
      ))}

      <div className="flex relative z-10">
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-red-700 via-red-600 to-green-700 border-r-4 border-yellow-400 flex flex-col shadow-2xl">
          <div className="p-6 border-b-2 border-yellow-400 bg-white/10 backdrop-blur-sm">
            <div className="flex items-center">
              <img
                src="/gpcf-logo.png"
                alt="Great Pearl Coffee"
                className="w-12 h-12 object-contain mr-3 bg-white rounded-full p-1"
              />
              <div>
                <h1 className="text-lg font-bold text-white drop-shadow-lg">Great Pearl</h1>
                <p className="text-xs text-yellow-200 font-medium">Finance Portal</p>
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="text-yellow-300 font-semibold text-sm animate-twinkle">🎄 Merry Christmas! 🎅</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <Navigation />
          </div>

          <div className="p-4 border-t-2 border-yellow-400 bg-white/10 backdrop-blur-sm">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center px-3 py-2 text-sm rounded-lg hover:bg-white/20 transition-colors"
              >
                <div className="w-8 h-8 bg-yellow-300 rounded-full flex items-center justify-center mr-3 shadow-lg">
                  <User className="w-4 h-4 text-red-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-white truncate drop-shadow">{employee?.name}</p>
                  <p className="text-xs text-yellow-200 truncate">{employee?.role}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{employee?.name}</p>
                    <p className="text-xs text-gray-600">{employee?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {employee?.department} • {employee?.position}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 ml-64">
          <div className="sticky top-0 z-40 bg-gradient-to-r from-red-600 to-green-600 border-b-4 border-yellow-400 px-8 py-4 flex items-center justify-between shadow-lg">
            <div className="flex-1">
              <p className="text-white font-semibold text-lg drop-shadow-lg">🎄 Happy Holidays! Season's Greetings 🎁</p>
            </div>
            <NotificationBell />
          </div>
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
