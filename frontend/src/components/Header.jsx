import React, { useState, useRef, useEffect } from 'react'
import { Database, Settings, User, LogOut, ChevronDown, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Header = () => {
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const [darkMode, setDarkMode] = useState(false)
  const dropdownRef = useRef(null)
  const [dropdownHeight, setDropdownHeight] = useState(0)

  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName
    if (user?.email) return user.email.split('@')[0]
    return 'User'
  }

  const getUserInitials = () => {
    const name = getUserDisplayName()
    return name.charAt(0).toUpperCase()
  }

  useEffect(() => {
    if (dropdownRef.current && dropdownOpen) {
      setDropdownHeight(dropdownRef.current.offsetHeight)
    }
  }, [dropdownOpen])

  const handleLogout = async () => {
    try {
      console.log('Attempting to sign out...')
      await logout()
      console.log('Sign out successful')
      setDropdownOpen(false)
    } catch (error) {
      console.error('Sign out failed:', error)
      alert('Failed to sign out: ' + error.message)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    // Toggle dark class on document root
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 animate-slide-down" style={{ zIndex: 9999999, position: 'relative' }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 animate-fade-in">
            <Database className="w-8 h-8 text-primary-600 animate-pulse" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white animate-fade-in-up">AI Powered SQL Generator</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up animation-delay-200">Group-1</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-110 animate-bounce-in"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5 animate-spin-slow" /> : <Moon className="w-5 h-5 animate-pulse" />}
            </button>
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-110 animate-bounce-in animation-delay-100">
              <Settings className="w-5 h-5 hover:animate-spin" />
            </button>
            
            {/* User Profile Dropdown */}
            <div className="relative" style={{ zIndex: 9999999 }}>
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setDropdownPosition({
                    top: rect.bottom + 8, // Position below the button
                    right: window.innerWidth - rect.right
                  })
                  setDropdownOpen(!dropdownOpen)
                }}
                className="flex items-center space-x-2 p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 hover:scale-105 animate-bounce-in animation-delay-200"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    getUserInitials()
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {getUserDisplayName()}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div 
                  ref={dropdownRef}
                  className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-1 animate-scale-in"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    right: `${dropdownPosition.right}px`,
                    zIndex: 9999999
                  }}
                >
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
