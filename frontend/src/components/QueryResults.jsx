import React, { useState } from 'react'
import { Copy, Play, Download, Eye, Code, Loader2, AlertCircle } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

const QueryResults = ({ query, isLoading, activeConnection, metadata }) => {
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResults, setExecutionResults] = useState(null)
  const [executionError, setExecutionError] = useState(null)

  const handleCopy = async () => {
    if (query) {
      await navigator.clipboard.writeText(query)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExecute = async () => {
    if (!activeConnection || !activeConnection.rag_ready) {
      alert('Please connect to a database first!')
      return
    }

    setIsExecuting(true)
    setExecutionError(null)
    setExecutionResults(null)

    console.log('Execute - Available metadata:', metadata)

    try {
      let requestBody = {
        database_type: activeConnection.type.toLowerCase()
      }

      // Parse query - check if it's JSON (MongoDB) or SQL
      let parsedQuery = query
      let queryType = 'sql'
      let collectionName = null

      try {
        // Try to parse as JSON for MongoDB
        const jsonQuery = JSON.parse(query)
        parsedQuery = jsonQuery
        queryType = 'mongodb'
        
        // Extract collection name if present in the query object
        if (jsonQuery.collection || jsonQuery.collection_name) {
          collectionName = jsonQuery.collection || jsonQuery.collection_name
          // Remove collection from query object
          const { collection, collection_name, ...actualQuery } = jsonQuery
          parsedQuery = actualQuery
        }
      } catch (e) {
        // Not JSON, treat as SQL
        parsedQuery = query
        queryType = 'sql'
      }

      if (activeConnection.type.toLowerCase() === 'mongodb') {
        // Check if it's an aggregation pipeline (contains $ operators at top level)
        const isAggregation = parsedQuery && typeof parsedQuery === 'object' && 
                             Object.keys(parsedQuery).some(key => key.startsWith('$'))
        
        // For aggregation queries, send as string or array
        if (isAggregation) {
          // Convert to aggregation pipeline format
          requestBody.query = query // Send original query string
          requestBody.is_aggregation = true
        } else {
          requestBody.query = parsedQuery
        }
        
        requestBody.query_type = 'mongodb'
        requestBody.database_name = activeConnection.selectedDatabase
        
        // Add collection_name - priority: metadata.primary_collection > metadata.relevant_tables > query > prompt
        if (metadata && metadata.primary_collection) {
          requestBody.collection_name = metadata.primary_collection
          console.log('Using primary_collection from metadata:', metadata.primary_collection)
        } else if (metadata && metadata.relevant_tables && metadata.relevant_tables.length > 0) {
          requestBody.collection_name = metadata.relevant_tables[0]
          console.log('Using first relevant_table from metadata:', metadata.relevant_tables[0])
        } else if (collectionName) {
          requestBody.collection_name = collectionName
          console.log('Using collection from query:', collectionName)
        } else {
          // If no collection name found, try to prompt or use a default
          console.warn('No collection name found in metadata or query, prompting user')
          const userCollection = prompt('Enter collection name for this MongoDB query:')
          if (!userCollection) {
            throw new Error('Collection name is required for MongoDB queries')
          }
          requestBody.collection_name = userCollection
          console.log('Using user-provided collection:', userCollection)
        }
      } else {
        // MySQL or Supabase
        requestBody.query = parsedQuery
        requestBody.query_type = 'sql'
        if (activeConnection.selectedDatabase) {
          requestBody.database_name = activeConnection.selectedDatabase
        }
      }

      console.log('Executing query:', requestBody)

      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const text = await response.text()
      console.log('Execution response:', text)

      let data = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch (e) {
        console.error('Failed to parse execution response:', text)
        throw new Error('Server returned invalid response')
      }

      if (!response.ok || data.status === 'failure') {
        throw new Error(data.error || data.message || 'Query execution failed')
      }

      // Normalize the response - handle both 'data' and 'result' fields
      const normalizedData = {
        ...data,
        data: data.data || data.result || [],
        count: data.count || (data.data || data.result || []).length
      }

      console.log('Normalized execution results:', normalizedData)

      setExecutionResults(normalizedData)
      setShowPreview(true)

    } catch (error) {
      console.error('Query execution error:', error)
      let errorMessage = error.message
      
      // Provide helpful message for aggregation errors
      if (errorMessage.includes('unknown top level operator') || errorMessage.includes('$count')) {
        errorMessage = `MongoDB Aggregation Error: The query contains aggregation operators (like $count, $group, etc.) which require special handling. 
        
The backend needs to use the aggregation pipeline instead of find(). Please ensure the backend /execute endpoint supports aggregation queries.

Original error: ${error.message}`
      }
      
      setExecutionError(errorMessage)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleDownload = () => {
    if (query) {
      const blob = new Blob([query], { type: 'text/sql' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'generated-query.sql'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Generating SQL Query...</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (!query) {
    return (
      <div className="card p-6 text-center">
        <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Query Generated Yet</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Enter a natural language description above to generate your SQL query
        </p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Generated SQL Query</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary flex items-center text-sm"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showPreview ? 'Hide' : 'Preview'}
          </button>
          <button
            onClick={handleCopy}
            className="btn-secondary flex items-center text-sm"
          >
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="btn-secondary flex items-center text-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="btn-primary flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Execute
              </>
            )}
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <SyntaxHighlighter
          language="sql"
          style={tomorrow}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '14px'
          }}
        >
          {query}
        </SyntaxHighlighter>
      </div>

      {/* Execution Error */}
      {executionError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-200">Execution Failed</h3>
              <p className="text-sm text-red-600 dark:text-red-300 mt-1">{executionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Execution Results */}
      {showPreview && executionResults && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Query Results</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {executionResults.count || 0} row(s) returned
            </span>
          </div>
          
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded overflow-auto max-h-96">
            {executionResults.data && executionResults.data.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr className="border-b dark:border-gray-600">
                    {Object.keys(executionResults.data[0]).map((column, idx) => (
                      <th key={idx} className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {executionResults.data.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {Object.values(row).map((value, colIdx) => (
                        <td key={colIdx} className="p-3 text-gray-900 dark:text-gray-100">
                          {value !== null && value !== undefined 
                            ? typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)
                            : <span className="text-gray-400 italic">null</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Code className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data returned</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default QueryResults
