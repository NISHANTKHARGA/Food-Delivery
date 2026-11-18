import React, {useState } from 'react'
import './Add.css'
import axios, { getErrorMessage } from "../../utils/api"
import { assets } from '../../assets/assets'
import { toast } from 'react-toastify'
import { NPR_RATE } from '../../utils/currency'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

const Add = ({url}) => {


    const [image,setImage]=useState(false);
    const [submitting,setSubmitting]=useState(false);
    const [data,setData]=useState({
        name:"",
        description:"",
        price:"",
        category:"Salad"
    })

        const onChangeHandler=(event)=>{
            const name=event.target.name;
            const value=event.target.value;
            setData(data=>({...data,[name]:value}))

        }

        const onImageChange=(event)=>{
            const file=event.target.files?.[0]
            if (!file) {
                setImage(false)
                return
            }
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                toast.error("Only JPG, PNG, WEBP or GIF images are allowed")
                event.target.value=""
                setImage(false)
                return
            }
            if (file.size > MAX_IMAGE_BYTES) {
                toast.error("Image must be 5MB or smaller")
                event.target.value=""
                setImage(false)
                return
            }
            setImage(file)
        }

        const onSubmitHandler =async(event)=>{
            event.preventDefault();
            if (submitting) return;

            if (!image) {
                toast.error("Please upload an image")
                return
            }

            const formData= new FormData();
            formData.append("name",data.name.trim())
            formData.append("description",data.description.trim())
            formData.append("price",Number(data.price) / NPR_RATE)
            formData.append("category",data.category)
            formData.append("image",image)

            setSubmitting(true)
            try {
                const response=await axios.post(`${url}/api/food/add`,formData)
                if(response.data?.success){
                    setData({
                        name:"",
                        description:"",
                        price:"",
                        category:"Salad"
                    })
                    setImage(false)
                    toast.success(response.data.message)
                }
                else{
                    toast.error(response.data?.message || "Error")
                }
            }
            catch (error) {
                toast.error(getErrorMessage(error, "Could not add the food item"))
            }
            finally {
                setSubmitting(false)
            }
        }
        
 

  return (
    <div className='add'>
        <form className="flex-col" onSubmit={onSubmitHandler}>
            <div className="add-img-upload flex-col">
                <p>Upload Image</p>
                <label htmlFor="image">
                    <img src={image?URL.createObjectURL(image):assets.upload_area} alt="" />
                </label>
                <input onChange={onImageChange} type="file" id='image' accept="image/png,image/jpeg,image/webp,image/gif" hidden />
            </div>
            <div className="add-product-name flex-col">
                <p>Product Name</p>
                <input onChange={onChangeHandler} value={data.name} type="text" name='name' placeholder='Type here' maxLength={100} required/>
                </div>
                <div className='add-product-description flex-col'>
                <p>Product description</p>
                <textarea onChange={onChangeHandler} value={data.description} name="description" rows="6" placeholder="Write content here" maxLength={1000} required></textarea>
            </div>
            <div className="add-category-price">
                <div className="add-category flex-col">
                    <p>Product category</p>
                    <select onChange={onChangeHandler} name="category" >
                        <option value="Salad">Salad</option>
                        <option value="Rolls">Rolls</option>
                        <option value="Deserts">Deserts</option>
                        <option value="Sandwich">Sandwich</option>
                        <option value="Cake">Cake</option>
                        <option value="Pure Veg">Pure Veg</option>
                        <option value="Pasta">Pasta</option>
                        <option value="Noodels">Noodels</option>
                    </select>
                </div>
                <div className="add-price flex-col">
                    <p>Product Price (NPR)</p>
                    <input onChange={onChangeHandler} value={data.price} type="Number" name='price' placeholder='Rs 300' min="0" step="0.01" required/>
                </div>
            </div>
                <button type='submit' className='add-btn' disabled={submitting}>{submitting ? "Adding..." : "Add"}</button>
        </form>

    </div>
  )
}

export default Add
