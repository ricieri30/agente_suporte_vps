import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { Menu, X, Shield, LayoutDashboard, Container, Database, Settings } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Containers from './pages/Containers'
import Backups from './pages/Backups'
import SettingsPage from './pages/Settings'
import { Toaster } from 'react-hot-toast'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Containers', path: '/containers', icon: Container },
    { name: 'Backups', path: '/backups', icon: Database },
    { name: 'Settings', path: '/settings', icon: Settings }
  ]

  return (
    <Router>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-dark-950 flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} hidden lg:block bg-dark-900 border-r border-dark-800 transition-all duration-300`}>
          <div className="p-4 border-b border-dark-800 flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-white">Guardian</span>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-dark-800 rounded">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-2">
            {nav.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) => `flex items-center px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-blue-600 text-white' : 'text-dark-400 hover:bg-dark-800'}`}
                >
                  <Icon className="w-5 h-5" />
                  {sidebarOpen && <span className="ml-3">{item.name}</span>}
                </NavLink>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Menu */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-3 rounded-lg bg-dark-900 border border-dark-800 text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-dark-950/95 backdrop-blur pt-20">
            <div className="w-full p-4 space-y-2">
              {nav.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-blue-600 text-white' : 'text-dark-400 hover:bg-dark-800'}`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1">
          <div className="min-h-screen p-4 lg:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/containers" element={<Containers />} />
              <Route path="/backups" element={<Backups />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App
