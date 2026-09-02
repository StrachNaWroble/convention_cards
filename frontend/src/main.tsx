import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
// Na razie importujemy widok rejestracji, by to sprawdzić. Później użyjemy React Routera.
import { RegisterView } from './app/RegisterView'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RegisterView />
  </React.StrictMode>,
)
