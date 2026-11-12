import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/components.css'
import './styles/layout.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root no existe')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
