import React, { useState, useEffect,useContext } from 'react'
import './PlaceOrder.css'
import { StoreContext } from '../../Context/StoreContext'
import axios, { getErrorMessage } from '../../utils/api'
import { useNavigate } from 'react-router-dom'
import { formatNPR } from '../../utils/currency'


const PlaceOrder = () => {
  const {getTotalCartAmount,token,food_list,cartItems,url} =useContext(StoreContext);
  const navigate = useNavigate();
  const [submitting,setSubmitting] = useState(false);
  const [data,setData] = useState({
    firstName:"",
    lastName:"",
    email:"",
    street:"",
    city:"",
    state:"",
    zipcode:"",
    country:"",
    phone:""
  })
  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setData(data=>({...data,[name]:value}))
  }

  const redirectToCheckout = (sessionUrl) => {
    try {
      const parsed = new URL(sessionUrl);
      if (parsed.protocol === "https:" && (parsed.hostname === "stripe.com" || parsed.hostname.endsWith(".stripe.com"))) {
        window.location.replace(parsed.toString());
        return true;
      }
    } catch {
      // Ignore malformed URLs and fall through to the error branch.
    }
    return false;
  }

  const placeOrder = async (event) => {
    event.preventDefault();
    if (submitting) return;

    // Only send item ids and quantities. The server looks up prices itself.
    const orderItems = [];
    food_list.forEach((item) => {
      const quantity = Number(cartItems[item._id]) || 0;
      if (quantity > 0) {
        orderItems.push({ id: item._id, quantity });
      }
    })

    if (orderItems.length === 0) {
      alert("Your cart is empty");
      navigate('/cart');
      return;
    }

    const orderData = {
      address:data,
      items:orderItems,
    }

    setSubmitting(true);
    try {
      const response = await axios.post(url+"/api/order/place",orderData,{headers:{token}})

      if (response.data?.success && redirectToCheckout(response.data.session_url)) {
        return;
      }
      alert(getErrorMessage({ response }, "Could not start checkout"));
    }
    catch (error) {
      alert(getErrorMessage(error, "Could not start checkout"));
    }
    finally {
      setSubmitting(false);
    }
  }

  useEffect(()=>{
    if (!token){
      navigate('/cart')
    }
    else if(getTotalCartAmount()===0)
    {
      navigate('/cart')
    }
  },[token])


  return (


    <form onSubmit={placeOrder} className='place-order'>
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="multi-fields">
          <input required name='firstName' onChange={onChangeHandler} value={data.firstName} type="text" placeholder='First Name'/>
          <input required name='lastName'onChange={onChangeHandler} value={data.lastName} type="text" placeholder='Last Name'/>
        </div>
        <input required name='email' onChange={onChangeHandler} value={data.email}  type="email" placeholder='Email Address'/>
        <input  required name='street' onChange={onChangeHandler} value={data.street} type="text" placeholder='Street' />
        <div className="multi-fields">
          <input  required name='city' onChange={onChangeHandler} value={data.city} type="text" placeholder='City'/>
          <input required name='state' onChange={onChangeHandler} value={data.state} type="text" placeholder='State'/>
        </div>
        <div className="multi-fields">
          <input required name='zipcode' onChange={onChangeHandler} value={data.zipcode} type="text" placeholder='Zip code'/>
          <input required name='country' onChange={onChangeHandler} value={data.country} type="text" placeholder='Country'/>
        </div>
        <input required name='phone' onChange={onChangeHandler} value={data.phone} type="text" placeholder='Phone'/>
      </div>
      <div className="place-order-right">
      <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className='cart-total-details'>
              <p>Subtotal</p>
              <p>{formatNPR(getTotalCartAmount())}</p>
            </div>
            <hr/>
            <div className='cart-total-details'>
              <p>Delivery Fee</p>
              <p>{formatNPR(getTotalCartAmount()===0?0:2)}</p>
            </div>
            <hr/>
            <div className='cart-total-details'>
              <b>Total</b>
              <b>{formatNPR(getTotalCartAmount()===0?0:getTotalCartAmount()+2)}</b>
            </div>
          </div>
            <button type='submit' disabled={submitting}>{submitting ? "PLEASE WAIT..." : "PROCEED TO PAYMENT"}</button>
        </div>
      </div>

    </form>
  )
}

export default PlaceOrder;
