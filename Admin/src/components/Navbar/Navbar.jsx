import React from 'react'
import './Navbar.css'
import {assets} from '../../assets/assets'
const Navbar = ({onLogout}) => {
  return (
    <div className='navbar'>
        <img className='logo' src={assets.logo} alt="" />
        <div className='navbar-right'>
            <img className='profile' src={assets.profile_image} alt="" />
            {onLogout ? <button type='button' className='logout-btn' onClick={onLogout}>Logout</button> : null}
        </div>
    </div>
  )
}

export default Navbar
