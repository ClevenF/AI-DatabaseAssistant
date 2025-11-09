import React from 'react'
import { Clock, Trash2, Star } from 'lucide-react'

const QueryHistory = ({ queries, onSelectQuery }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateText = (text, maxLength = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  if (queries.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Query History</h3>
        </div>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No queries generated yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Your query history will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Query History</h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{queries.length} queries</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {queries.map((query) => (
          <div
            key={query.id}
            className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors cursor-pointer transition-all duration-200 group"
            onClick={() => onSelectQuery(query)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                {truncateText(query.naturalLanguage)}
              </h3>
              <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 text-gray-400 hover:text-yellow-500">
                  <Star className="w-3 h-3" />
                </button>
                <button className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
              {formatTime(query.timestamp)}
            </span>
            <div className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
              {truncateText(query.sqlQuery.replace(/\s+/g, ' ').trim(), 80)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-4">
          Clear All History
        </button>
      </div>
    </div>
  )
}

export default QueryHistory
