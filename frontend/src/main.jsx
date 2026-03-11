import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  import.meta.env.DEV ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ),
)
