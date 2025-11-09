import React, { useState } from 'react'
import { Send, User, Bot, Loader2, MessageSquare, Code2 } from 'lucide-react'

const QueryInput = ({ onGenerateQuery, isLoading, activeConnection, onModeChange }) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('')
  const [mode, setMode] = useState('sql') // 'sql' or 'chat'
  
  // Separate message histories for each mode
  const [sqlMessages, setSqlMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your SQL assistant. Describe what data you want to retrieve and I\'ll generate the perfect SQL query for you.',
      timestamp: new Date().toISOString()
    }
  ])
  
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your chat assistant. Ask me questions about your data and I\'ll provide detailed answers.',
      timestamp: new Date().toISOString()
    }
  ])

  // Get current messages based on mode
  const messages = mode === 'sql' ? sqlMessages : chatMessages
  const setMessages = mode === 'sql' ? setSqlMessages : setChatMessages

  // Update mode without clearing messages
  const handleModeChange = (newMode) => {
    setMode(newMode)
    
    // Notify parent component about mode change
    if (onModeChange) {
      onModeChange(newMode)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (naturalLanguageInput.trim()) {
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: naturalLanguageInput,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, userMessage])
      
      // Clear input
      const currentInput = naturalLanguageInput
      setNaturalLanguageInput('')
      
      // Add loading message
      const loadingMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Generating SQL query...',
        timestamp: new Date().toISOString(),
        isLoading: true
      }
      
      setMessages(prev => [...prev, loadingMessage])
      
      try {
        // Check if database is connected
        if (!activeConnection || !activeConnection.rag_ready) {
          setMessages(prev => {
            const withoutLoading = prev.filter(msg => !msg.isLoading)
            const errorResponse = {
              id: Date.now() + 2,
              type: 'bot',
              content: 'Please connect to a database and prepare RAG before asking questions.',
              timestamp: new Date().toISOString()
            }
            return [...withoutLoading, errorResponse]
          })
          return
        }

        // Determine API endpoint based on mode
        const endpoint = mode === 'chat' ? '/api/conversation' : '/api/chat'
        
        // Build request body - different format for chat mode
        let requestBody
        if (mode === 'chat') {
          // Chat mode uses question, database_name, and database_type
          requestBody = {
            question: currentInput,
            database_name: activeConnection.selectedDatabase || activeConnection.name,
            database_type: activeConnection.type.toLowerCase()
          }
        } else {
          // SQL Agent mode uses prompt and database_name
          requestBody = {
            prompt: currentInput,
            database_name: activeConnection.selectedDatabase || activeConnection.name
          }
        }

        console.log(`Sending ${mode} request to ${endpoint}:`, requestBody)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
        
        const result = await response.json()
        console.log(`${mode} mode API response:`, result)
        
        // Extract response based on mode
        let generatedQuery = null
        let displayContent = ''
        
        if (response.ok) {
          if (mode === 'chat') {
            // Chat mode - display the answer
            const answer = result.answer || result.message || 'Response received'
            displayContent = answer
            generatedQuery = null // No query to execute in chat mode
            
            // Check if answer contains JSON data (for MongoDB responses)
            let jsonData = null
            let textContent = answer
            
            try {
              // Try to parse if the entire answer is JSON
              const parsed = JSON.parse(answer)
              if (typeof parsed === 'object') {
                jsonData = parsed
                textContent = null
              }
            } catch (e) {
              // Not pure JSON, check if it contains JSON blocks
              const jsonMatch = answer.match(/\{[\s\S]*\}|\[[\s\S]*\]/g)
              if (jsonMatch) {
                try {
                  jsonData = JSON.parse(jsonMatch[0])
                  textContent = answer.replace(jsonMatch[0], '').trim()
                } catch (e2) {
                  // Keep as regular text
                }
              }
            }
            
            // Store JSON separately if found
            if (jsonData) {
              setMessages(prev => {
                const withoutLoading = prev.filter(msg => !msg.isLoading)
                const botResponse = {
                  id: Date.now() + 2,
                  type: 'bot',
                  content: displayContent,
                  jsonData: jsonData,
                  textContent: textContent,
                  timestamp: new Date().toISOString()
                }
                return [...withoutLoading, botResponse]
              })
              return
            }
          } else {
            // SQL mode - display only the query, not full API response
            let generatedQuery = null
            let displayContent = ''

            // Extract query for execution and display
            if (result.generated_query) {
              generatedQuery = JSON.stringify(result.generated_query, null, 2)
              displayContent = `Generated Query:\n\`\`\`json\n${generatedQuery}\n\`\`\``
            } else if (result.sql_query) {
              generatedQuery = result.sql_query
              displayContent = generatedQuery
            } else if (result.message) {
              generatedQuery = result.message
              displayContent = result.message
            } else {
              displayContent = 'No query generated'
            }

            // Store for execution but don't show full response
            setMessages(prev => {
              const withoutLoading = prev.filter(msg => !msg.isLoading)
              const botResponse = {
                id: Date.now() + 2,
                type: 'bot',
                content: displayContent,
                timestamp: new Date().toISOString(),
                sqlQuery: generatedQuery
              }
              return [...withoutLoading, botResponse]
            })

            // Call the original onGenerateQuery for compatibility
            if (generatedQuery) {
              onGenerateQuery(currentInput, '', generatedQuery, result.metadata)
            }
            return
          }
        } else {
          displayContent = `Failed: ${result.error || result.message || 'Unknown error'}`
        }
        
        // Remove loading message and add bot response
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          const botResponse = {
            id: Date.now() + 2,
            type: 'bot',
            content: displayContent,
            timestamp: new Date().toISOString(),
            sqlQuery: generatedQuery
          }
          return [...withoutLoading, botResponse]
        })
        
        // Call the original onGenerateQuery for compatibility
        if (response.ok && generatedQuery) {
          onGenerateQuery(currentInput, '', generatedQuery)
        }
        
      } catch (error) {
        console.error('Chat API error:', error)
        
        // Remove loading message and add error response
        setMessages(prev => {
          const withoutLoading = prev.filter(msg => !msg.isLoading)
          const errorResponse = {
            id: Date.now() + 2,
            type: 'bot',
            content: 'Sorry, I encountered an error while generating the SQL query. Please try again.',
            timestamp: new Date().toISOString()
          }
          return [...withoutLoading, errorResponse]
        })
      }
    }
  }

  return (
    <div className={`card p-0 mb-6 flex flex-col ${mode === 'chat' ? 'h-[600px]' : 'h-96'}`}>
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              {mode === 'sql' ? (
                <>
                  <Code2 className="w-5 h-5 text-blue-500 mr-2" />
                  SQL Agent
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 text-purple-500 mr-2" />
                  Chat Mode
                </>
              )}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {mode === 'sql' 
                ? 'Generate SQL queries from natural language' 
                : 'Ask questions and get answers about your data'
              }
            </p>
          </div>
          {activeConnection && activeConnection.rag_ready && (
            <div className="text-right">
              <div className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                Connected
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {activeConnection.type} • {activeConnection.selectedDatabase || activeConnection.name}
              </div>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => handleModeChange('sql')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
              mode === 'sql'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL Agent</span>
          </button>
          <button
            onClick={() => handleModeChange('chat')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
              mode === 'chat'
                ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat Mode</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {message.type === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className={`flex-1 max-w-xs lg:max-w-md ${
              message.type === 'user' ? 'text-right' : 'text-left'
            }`}>
              <div className={`inline-block p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
              }`}>
                {message.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  <div className="text-sm">
                    {message.content.includes('```json') ? (
                      <div>
                        <p className="mb-2">Generated Query:</p>
                        <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(JSON.parse(message.content.split('```json\n')[1].split('\n```')[0]), null, 2)}
                        </pre>
                      </div>
                    ) : message.jsonData ? (
                      // Display JSON data nicely formatted
                      <div>
                        {message.textContent && <p className="mb-2">{message.textContent}</p>}
                        <pre className="bg-gray-800 dark:bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-96">
                          {JSON.stringify(message.jsonData, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            placeholder={mode === 'sql' 
              ? "Describe what data you want to retrieve..." 
              : "Ask a question about your data..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!naturalLanguageInput.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default QueryInput
