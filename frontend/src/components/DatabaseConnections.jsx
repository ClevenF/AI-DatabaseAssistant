import React, { useState } from 'react'
import { Database, Plus, Check, X, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react'

const DatabaseConnections = ({ onConnectionSelect, activeConnection }) => {
  const [connections, setConnections] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [selectedConnectionId, setSelectedConnectionId] = useState(null)
  const [isPreparingRag, setIsPreparingRag] = useState(false)
  const [newConnection, setNewConnection] = useState({
    name: '',
    type: 'Mongodb',
    host: '',
    database: '',
    // Supabase specific
    anonKey: '',
    // MySQL specific
    username: '',
    port: '',
    password: ''
  })

  const databaseTypes = [
    { value: 'Mongodb', label: 'MongoDB', icon: '🍃' },
    { value: 'Supabase', label: 'Supabase', icon: '⚡' },
    { value: 'Mysql', label: 'MySQL', icon: '🐬' }
  ]

  const handleAddConnection = async () => {
    // Validation based on database type
    let isValid = false
    if (newConnection.type === 'Mongodb') {
      isValid = newConnection.name && newConnection.host
    } else if (newConnection.type === 'Supabase') {
      isValid = newConnection.name && newConnection.host && newConnection.anonKey
    } else if (newConnection.type === 'Mysql') {
      isValid = newConnection.name && newConnection.host && newConnection.username && newConnection.port && newConnection.password
    }

    if (isValid) {
      setIsConnecting(true)
      setError('')
      
      try {
        // Prepare request body based on database type
        let requestBody = {
          database_type: newConnection.type.toLowerCase()
        }

        if (newConnection.type === 'Mongodb') {
          requestBody.connection_string = newConnection.host
        } else if (newConnection.type === 'Supabase') {
          requestBody.connection_string = newConnection.host
          requestBody.connection_key = newConnection.anonKey
        } else if (newConnection.type === 'Mysql') {
          requestBody.host = newConnection.host
          requestBody.username = newConnection.username
          requestBody.port = parseInt(newConnection.port) || 3306
          requestBody.password = newConnection.password
        }

        console.log('Sending connection request:', requestBody)
        
        const response = await fetch('/api/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
        
        // Check if response has content before parsing JSON
        const text = await response.text()
        console.log('Server response status:', response.status)
        console.log('Server response text:', text)
        
        let data = {}
        
        try {
          data = text ? JSON.parse(text) : {}
        } catch (e) {
          console.error('Failed to parse response:', text)
          throw new Error('Server returned invalid response: ' + text.substring(0, 100))
        }
        
        if (!response.ok) {
          console.error('Server error:', data)
          const errorMessage = data.error || data.message || data.detail || 'Unknown server error'
          throw new Error(`${errorMessage} (Status: ${response.status})`)
        }
        
        console.log('Connection successful:', data)
        
        const connection = {
          id: Date.now(),
          name: newConnection.name,
          type: newConnection.type,
          host: newConnection.host,
          status: 'connected',
          databases: data.databases || data.available_tables || [],
          rag_ready: data.rag_ready || false,
          version: data.mysql_version || null
        }
        setConnections([...connections, connection])
        
        // If Supabase and RAG is ready, set it as active connection
        if (newConnection.type === 'Supabase' && data.rag_ready && onConnectionSelect) {
          onConnectionSelect(connection)
        }
        
        setNewConnection({ 
          name: '', 
          type: 'Mongodb', 
          host: '', 
          database: '',
          anonKey: '',
          username: '',
          port: '',
          password: ''
        })
        setShowAddForm(false)
        
      } catch (error) {
        console.error('Connection failed:', error)
        if (error.message.includes('Failed to fetch') || error.message.includes('ECONNRESET')) {
          setError('Backend server is not accessible. Please check if your Flask server and ngrok tunnel are running.')
        } else {
          setError(error.message || 'Failed to connect to database')
        }
      } finally {
        setIsConnecting(false)
      }
    }
  }

  const handlePrepareRag = async (connectionId, databaseName) => {
    const connection = connections.find(conn => conn.id === connectionId)
    if (!connection) return

    setIsPreparingRag(true)
    
    try {
      const requestBody = {
        database_type: connection.type.toLowerCase(),
        database_name: databaseName
      }

      console.log('Preparing RAG:', requestBody)

      const response = await fetch('/api/prepare_rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const text = await response.text()
      console.log('RAG response:', text)

      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        console.error('Failed to parse RAG response:', text)
        throw new Error('Server returned invalid response')
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to prepare RAG')
      }

      // Update connection with selected database and RAG status
      const updatedConnection = {
        ...connection,
        selectedDatabase: databaseName,
        rag_ready: data.rag_ready || true
      }
      
      setConnections(connections.map(conn => 
        conn.id === connectionId ? updatedConnection : conn
      ))

      // Set this as the active connection
      if (onConnectionSelect) {
        onConnectionSelect(updatedConnection)
      }

      alert(`RAG prepared successfully for database: ${databaseName}`)
      setSelectedConnectionId(null)

    } catch (error) {
      console.error('RAG preparation failed:', error)
      alert('Failed to prepare RAG: ' + error.message)
    } finally {
      setIsPreparingRag(false)
    }
  }

  const toggleConnection = async (id) => {
    // Just toggle the UI status (credentials not stored for security)
    setConnections(connections.map(conn => 
      conn.id === id 
        ? { ...conn, status: conn.status === 'connected' ? 'disconnected' : 'connected' } 
        : conn
    ))
  }

  const removeConnection = (id) => {
    setConnections(connections.filter(conn => conn.id !== id))
  }

  const getTypeIcon = (type) => {
    const dbType = databaseTypes.find(db => db.value === type)
    return dbType ? dbType.icon : '💾'
  }

  return (
    <div className="card p-6 mb-6 animate-fade-in-up hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center animate-slide-in-left">
          <Database className="w-5 h-5 text-blue-500 mr-2 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Databases</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-300 hover:scale-110 animate-bounce-in"
        >
          <Plus className={`w-4 h-4 transition-transform duration-300 ${showAddForm ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Add Connection Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 animate-scale-in">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 animate-fade-in">Add New Database</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Database Type
              </label>
              <select
                value={newConnection.type}
                onChange={(e) => setNewConnection({ ...newConnection, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {databaseTypes.map(db => (
                  <option key={db.value} value={db.value}>
                    {db.icon} {db.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Connection Name
              </label>
              <input
                type="text"
                value={newConnection.name}
                onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                placeholder="My Database"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* MongoDB Fields */}
            {newConnection.type === 'Mongodb' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Connection String
                </label>
                <input
                  type="text"
                  value={newConnection.host}
                  onChange={(e) => setNewConnection({ ...newConnection, host: e.target.value })}
                  placeholder="mongodb://localhost:27017 or connection string"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Supabase Fields */}
            {newConnection.type === 'Supabase' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Database URL
                  </label>
                  <input
                    type="text"
                    value={newConnection.host}
                    onChange={(e) => setNewConnection({ ...newConnection, host: e.target.value })}
                    placeholder="https://xxxxx.supabase.co"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Anon Key
                  </label>
                  <input
                    type="password"
                    value={newConnection.anonKey}
                    onChange={(e) => setNewConnection({ ...newConnection, anonKey: e.target.value })}
                    placeholder="Your Supabase anon key"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* MySQL Fields */}
            {newConnection.type === 'Mysql' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Host
                  </label>
                  <input
                    type="text"
                    value={newConnection.host}
                    onChange={(e) => setNewConnection({ ...newConnection, host: e.target.value })}
                    placeholder="localhost or IP address"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={newConnection.port}
                    onChange={(e) => setNewConnection({ ...newConnection, port: e.target.value })}
                    placeholder="3306"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={newConnection.username}
                    onChange={(e) => setNewConnection({ ...newConnection, username: e.target.value })}
                    placeholder="root"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newConnection.password}
                    onChange={(e) => setNewConnection({ ...newConnection, password: e.target.value })}
                    placeholder="Your MySQL password"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Connection Failed</p>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleAddConnection}
                disabled={
                  isConnecting || 
                  !newConnection.name || 
                  (newConnection.type === 'Mongodb' && !newConnection.host) ||
                  (newConnection.type === 'Supabase' && (!newConnection.host || !newConnection.anonKey)) ||
                  (newConnection.type === 'Mysql' && (!newConnection.host || !newConnection.username || !newConnection.port || !newConnection.password))
                }
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm rounded transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Add Connection</span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setError('')
                }}
                disabled={isConnecting}
                className="px-3 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="space-y-2">
        {connections.length === 0 ? (
          <div className="text-center py-6">
            <Database className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No databases connected</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Click + to add your first database
            </p>
          </div>
        ) : (
          connections.map((connection) => (
            <div key={connection.id} className="space-y-2">
              <div
                className={`flex items-center justify-between p-3 rounded-lg border group hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                  activeConnection?.id === connection.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <div className="text-lg">{getTypeIcon(connection.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {connection.name}
                      </h4>
                      <div className="flex items-center space-x-1">
                        {connection.status === 'connected' ? (
                          <Wifi className="w-3 h-3 text-green-500" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-gray-400" />
                        )}
                        {connection.rag_ready && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            RAG Ready
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {connection.status !== 'connected' ? connection.host : 'Connected'}
                    </p>
                    {connection.selectedDatabase && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        📊 {connection.selectedDatabase}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Show database selector for MongoDB/MySQL (always) or Supabase (if not RAG ready) */}
                  {connection.databases && connection.databases.length > 0 && 
                   (connection.type !== 'Supabase' || !connection.rag_ready) && (
                    <button
                      onClick={() => setSelectedConnectionId(selectedConnectionId === connection.id ? null : connection.id)}
                      className="p-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors"
                      title="Select database"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleConnection(connection.id)}
                    className={`p-1 rounded transition-colors ${
                      connection.status === 'connected'
                        ? 'text-green-600 hover:text-green-700 dark:text-green-400'
                        : 'text-gray-400 hover:text-green-500'
                    }`}
                    title={connection.status === 'connected' ? 'Disconnect' : 'Connect'}
                  >
                    {connection.status === 'connected' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Wifi className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeConnection(connection.id)}
                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Remove connection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Database Selection Dropdown */}
              {selectedConnectionId === connection.id && connection.databases && connection.databases.length > 0 && (
                <div className="ml-8 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 animate-scale-in">
                  <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Select Database to Prepare RAG:
                  </h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {connection.databases.map((db, index) => (
                      <button
                        key={index}
                        onClick={() => handlePrepareRag(connection.id, db)}
                        disabled={isPreparingRag}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                      >
                        <span>{db}</span>
                        {isPreparingRag && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {connections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {connections.filter(c => c.status === 'connected').length} of {connections.length} databases connected
          </p>
        </div>
      )}
    </div>
  )
}

export default DatabaseConnections
