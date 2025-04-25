// client/src/App.tsx (Example with Tailwind)
import { Routes, Route, Link } from 'react-router-dom';
// Import your page components later

function App() {
  return (
    // Example container with padding using Tailwind classes
    <div className="container mx-auto p-5 font-sans">

      {/* Example heading */}
      <h1 className="text-2xl font-bold mb-4">Job Application Assistant</h1>

      {/* Example Navigation (very basic) */}
      <nav className="mb-4">
        <Link to="/" className="mr-4 text-blue-600 hover:underline">Home</Link>
        <Link to="/dashboard" className="mr-4 text-blue-600 hover:underline">Dashboard</Link>
        {/* Add other links later */}
      </nav>

      {/* Main content area */}
      <main>
        <Routes>
          {/* Example Route - Replace with actual pages later */}
          <Route path="/" element={<h2 className="text-xl">Welcome!</h2>} />
          <Route path="/dashboard" element={<h2 className="text-xl">Dashboard Placeholder</h2>} />
          {/* Add other routes here */}
        </Routes>
      </main>

    </div>
  )
}

export default App