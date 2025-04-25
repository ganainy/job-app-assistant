// client/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // Make sure this import remains to load Tailwind styles
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* No ChakraProvider needed */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)