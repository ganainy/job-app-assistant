// client/src/App.tsx
import { Routes, Route, Link } from 'react-router-dom';
// Import the DashboardPage component
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <div className="container mx-auto p-5 font-sans">
      <h1 className="text-2xl font-bold mb-4">Job Application Assistant</h1>

      <nav className="mb-4">
        <Link to="/" className="mr-4 text-blue-600 hover:underline">Home</Link>
        {/* Link to the dashboard */}
        <Link to="/dashboard" className="mr-4 text-blue-600 hover:underline">Dashboard</Link>
      </nav>

      <main>
        <Routes>
          {/* Home Route */}
          <Route path="/" element={<h2 className="text-xl">Welcome! (Home Page Placeholder)</h2>} />
          {/* Dashboard Route - Render the DashboardPage component */}
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Add other routes here later */}
        </Routes>
      </main>
    </div>
  )
}

export default App;