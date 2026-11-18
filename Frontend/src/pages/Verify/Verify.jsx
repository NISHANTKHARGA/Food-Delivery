import React, { useContext, useEffect, useRef } from 'react'
import "./Verify.css"
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StoreContext } from '../../Context/StoreContext';
import axios, { getErrorMessage } from '../../utils/api';


const Verify = () => {


    const [searchParams] = useSearchParams();
    const success = searchParams.get("success")
    const orderId = searchParams.get("orderId")

    const {url,token,setToken} = useContext(StoreContext);
    const navigate = useNavigate();
    const verificationStarted = useRef(false);

    const verifyPayment = async () => {
        if (verificationStarted.current) return;
        verificationStarted.current = true;

        try {
            const response = await axios.post(url+"/api/order/verify",{success,orderId},{headers:{token}});
            if (response.data?.success){
                navigate("/myorders");
            }
            else {
                navigate("/")
            }
        }
        catch (error) {
            if (error?.response?.status === 401) {
                localStorage.removeItem("token");
                setToken("");
            }
            console.error(getErrorMessage(error, "Could not verify payment"));
            navigate("/")
        }
    }
    useEffect(()=>{
        if (!token || !orderId) {
            navigate("/");
            return;
        }
        verifyPayment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])
  return (
    <div className='verify'>
        <div className="spinner"></div>
    </div>
  )
}

export default Verify
