import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- ESTA LÍNEA ES LA QUE DA EL COLOR Y DISEÑO

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)