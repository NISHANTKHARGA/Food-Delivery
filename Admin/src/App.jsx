import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import Sidebar from './components/Sidebar/Sidebar'
import { Route, Routes } from 'react-router-dom'
import Add from './pages/Add/Add'
import List from './pages/List/List'
import Orders from './pages/Orders/Orders'
import Login from './pages/Login/Login'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  API_URL,
  applyAdminToken,
  clearAdminToken,
  getAdminToken,
  saveAdminToken,
  setUnauthorizedHandler,
} from './utils/api'


const App = () => {

  const [token, setToken] = useState(getAdminToken())

  useEffect(() => {
    applyAdminToken(token)
  }, [token])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAdminToken()
      setToken("")
    })
  }, [])

  const handleLogin = (newToken) => {
    saveAdminToken(newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    clearAdminToken()
    setToken("")
  }

  if (!token) {
    return (
      <>
        <ToastContainer />
        <Login onLogin={handleLogin} />
      </>
    )
  }

  return (
    <div>
      <ToastContainer/>
      <Navbar onLogout={handleLogout}/>
      <hr/>
      <div className="app-content">
        <Sidebar/>
        <Routes>
          <Route path='/add' element={<Add url={API_URL}/>}/>
          <Route path='/list' element={<List url={API_URL}/>}/>
          <Route path='/orders' element={<Orders url={API_URL}/>}/>
        </Routes>
      </div>
    </div>
  )
}

export default App
