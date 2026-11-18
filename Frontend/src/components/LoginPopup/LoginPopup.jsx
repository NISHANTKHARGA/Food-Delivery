import React, { useContext, useState } from 'react'
import './LoginPopup.css'
import {assets} from '../../assets/assets'
import { StoreContext } from '../../Context/StoreContext'
import axios, { getErrorMessage } from "../../utils/api"


const LoginPopup = ({setShowLogin}) => {

    const {url,setToken}=useContext(StoreContext)

    const [currState,setCurrState]=useState("Sign-Up")
    const [submitting,setSubmitting]=useState(false)
    const [data,setData] =useState({
        name:"",
        email:"",
        password:""
    })

    const onChangeHandler=(event) =>{
        const name = event.target.name;
        const value = event.target.value;
        setData(data =>({...data,[name]:value}))
    }

    const OnLogin = async (event)=>{
        event.preventDefault()
        if (submitting) return;

        const endpoint = currState==="Login" ? "/api/user/login" : "/api/user/register";
        const payload = {
            email: data.email.trim(),
            password: data.password,
            ...(currState==="Login" ? {} : { name: data.name.trim() }),
        };

        setSubmitting(true);
        try {
            const response =await axios.post(url+endpoint,payload);
            if (response.data?.success && response.data.token) {
                setToken(response.data.token);
                localStorage.setItem("token",response.data.token)
                setShowLogin(false)
            }
            else{
                alert(response.data?.message || "Unable to sign in")
            }
        }
        catch (error) {
            alert(getErrorMessage(error, "Unable to sign in"))
        }
        finally {
            setSubmitting(false);
        }
    }
  return (
    <div className='login-popup'>
        <form onSubmit={OnLogin} className='login-popup-container'>
            <div className='login-popup-title'>
                <h2>{currState}</h2>
                <img onClick={()=>setShowLogin(false)} src={assets.cross_icon} alt=''></img>
            </div>
            <div className="login-popup-inputs">
                {currState==="Login"?<></>:<input name='name' onChange={onChangeHandler}  value={data.name} type='text' placeholder='Your Name' required/>}     
                <input name='email' onChange={onChangeHandler} value={data.email} type='email' placeholder='Your Email' required/>
                <input name='password' onChange={onChangeHandler} value={data.password} type='password' placeholder='Password' required/>

            </div>
            <button type='submit' disabled={submitting}>{currState==="Sign-Up"?"Create Account":"Login"}</button>
           <div className="login-popup-condition">
            <input type='checkbox' required></input>
            <p>By continuing,I agree to the terms of use & privacy policy.</p>
           </div>
           {currState==="Login"
                ?<p>Create a new account?<span onClick={()=>setCurrState("Sign-Up")}>Click here</span></p>
                :<p>Already have an account? <span onClick={()=>setCurrState("Login")}>Login here</span></p>
                
            }
        </form>

    </div>
  )
}

export default LoginPopup
