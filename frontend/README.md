# AI-Powered SQL Query Generator

A modern React frontend application that transforms natural language descriptions into SQL queries using AI. Built with Vite, React, and Tailwind CSS for a fast and beautiful user experience.

## Features

- **Natural Language to SQL**: Describe what you want in plain English and get SQL queries
- **Real-time Query Generation**: Powered by AI for accurate query creation
- **Query History**: Keep track of all your generated queries
- **Syntax Highlighting**: Beautiful SQL syntax highlighting with copy/download options
- **Schema Support**: Optional database schema input for more accurate queries
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Query Preview**: See sample results before executing queries

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Syntax Highlighting**: React Syntax Highlighter
- **HTTP Client**: Axios

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Major_Project_Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── Header.jsx          # App header with navigation
│   ├── QueryInput.jsx      # Natural language input form
│   ├── QueryResults.jsx    # SQL query display and actions
│   └── QueryHistory.jsx    # Query history sidebar
├── App.jsx                 # Main application component
├── main.jsx               # React entry point
└── index.css              # Global styles and Tailwind imports
```

## Usage

1. **Enter Natural Language Query**: Type what you want to query in plain English
   - Example: "Show me all users who registered in the last 30 days"

2. **Add Database Schema** (Optional): Click "Add Database Schema" to provide table structure for more accurate queries

3. **Generate SQL**: Click "Generate SQL" to create your query

4. **View Results**: The generated SQL appears with syntax highlighting

5. **Take Actions**: Copy, download, or execute your query

6. **Query History**: Access previously generated queries from the sidebar

## API Integration

The app is designed to work with an AI backend API. To connect your AI service:

1. Update the API endpoint in `src/App.jsx`:
   ```javascript
   const response = await fetch('/api/generate-sql', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       prompt: naturalLanguageInput,
       schema: schema
     })
   })
   ```

2. Ensure your backend accepts:
   - `prompt`: Natural language description
   - `schema`: Optional database schema

3. Expected response format:
   ```json
   {
     "sqlQuery": "SELECT * FROM users WHERE created_at >= '2024-01-01'"
   }
   ```

## Customization

### Styling
- Modify `tailwind.config.js` for custom colors and themes
- Update `src/index.css` for global styles
- Component styles use Tailwind utility classes

### Features
- Add new example queries in `QueryInput.jsx`
- Customize query history features in `QueryHistory.jsx`
- Extend query results actions in `QueryResults.jsx`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
