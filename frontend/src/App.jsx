import React, { useState } from 'react'
import Header from './components/Header'
import QueryInput from './components/QueryInput'
import QueryResults from './components/QueryResults'
import QueryHistory from './components/QueryHistory'
import DatabaseConnections from './components/DatabaseConnections'
import LoginPage from './components/LoginPage'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Database, Sparkles } from 'lucide-react'

function MainApp() {
  const { user } = useAuth()
  const [queries, setQueries] = useState([])
  const [currentQuery, setCurrentQuery] = useState('')
  const [currentMetadata, setCurrentMetadata] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeConnection, setActiveConnection] = useState(null)
  const [currentMode, setCurrentMode] = useState('sql')

  if (!user) {
    return <LoginPage />
  }

  const handleGenerateQuery = async (naturalLanguageInput, schema, sqlQuery = null, metadata = null) => {
    setIsLoading(true)
    
    try {
      // If sqlQuery is provided (from chat API), use it directly
      if (sqlQuery) {
        const newQuery = {
          id: Date.now(),
          naturalLanguage: naturalLanguageInput,
          sqlQuery: sqlQuery,
          timestamp: new Date().toISOString(),
          schema: schema,
          metadata: metadata // Store metadata for execution
        }
        
        setQueries(prev => [newQuery, ...prev])
        setCurrentQuery(newQuery.sqlQuery)
        setCurrentMetadata(metadata)
        setIsLoading(false)
        return
      }
      
      // Fallback for any other cases
      const fallbackQuery = {
        id: Date.now(),
        naturalLanguage: naturalLanguageInput,
        sqlQuery: `-- Generated SQL Query
SELECT * FROM table_name 
WHERE condition = 'value'
ORDER BY created_at DESC;`,
        timestamp: new Date().toISOString(),
        schema: schema
      }
      
      setQueries(prev => [fallbackQuery, ...prev])
      setCurrentQuery(fallbackQuery.sqlQuery)
    } catch (error) {
      console.error('Error generating query:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectQuery = (query) => {
    setCurrentQuery(query.sqlQuery)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 animate-gradient-shift">
      <Header />
      
      <main className="container mx-auto px-4 py-8 animate-fade-in-up animation-delay-300">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Query Input Section */}
          <div className="lg:col-span-2 animate-slide-in-left">
            <QueryInput 
              onGenerateQuery={handleGenerateQuery}
              isLoading={isLoading}
              activeConnection={activeConnection}
              onModeChange={setCurrentMode}
            />
            
            {/* Only show QueryResults in SQL mode */}
            {currentMode === 'sql' && (
              <QueryResults 
                query={currentQuery}
                isLoading={isLoading}
                activeConnection={activeConnection}
                metadata={currentMetadata}
              />
            )}
          </div>

          {/* Query History Sidebar */}
          <div className="lg:col-span-1 animate-slide-in-right animation-delay-200">
            <DatabaseConnections 
              onConnectionSelect={setActiveConnection}
              activeConnection={activeConnection}
            />
            <QueryHistory 
              queries={queries}
              onSelectQuery={handleSelectQuery}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}

export default App
