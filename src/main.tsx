import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TypingLab from './lab/index.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TypingLab />
  </StrictMode>,
)
