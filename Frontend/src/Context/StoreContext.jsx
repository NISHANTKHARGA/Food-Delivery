import { createContext, useEffect, useState } from "react";
import axios, { API_URL, getErrorMessage, isUnauthorized } from "../utils/api";


export const StoreContext = createContext(null)

const StoreContextProvider = (props) => {

    const [cartItems, setCartItems] = useState({});
    const url = API_URL;
    const [token, setToken] = useState("");
    const [food_list, setFoodList] = useState([]);

    const clearSession = () => {
        localStorage.removeItem("token");
        setToken("");
        setCartItems({});
    };

    const handleCartError = (error) => {
        if (isUnauthorized(error)) {
            clearSession();
            return;
        }
        alert(getErrorMessage(error, "Could not update your cart"));
    };

    const addToCart = async (itemId) => {
        if (!itemId) return;
        setCartItems((prev) => ({ ...prev, [itemId]: (Number(prev[itemId]) || 0) + 1 }))
        if (token) {
            try {
                await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
            } catch (error) {
                handleCartError(error);
            }
        }
    }

    const removeFromCart = async (itemId) => {
        if (!itemId) return;
        setCartItems((prev) => ({ ...prev, [itemId]: Math.max(0, (Number(prev[itemId]) || 0) - 1) }))
        if (token) {
            try {
                await axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } });
            } catch (error) {
                handleCartError(error);
            }
        }
    }

    const getTotalCartAmount = () => {
        let totalAmount = 0;
        for (const item in cartItems) {
            const quantity = Number(cartItems[item]) || 0;
            if (quantity > 0) {
                const itemInfo = food_list.find((product) => product._id === item);
                if (itemInfo) {
                    totalAmount += itemInfo.price * quantity;
                }
            }
        }
        return totalAmount;
    }

    const fetchFoodList = async () => {
        try {
            const response = await axios.get(url + "/api/food/list");
            if (response.data?.success) {
                setFoodList(response.data.data);
            }
        } catch (error) {
            console.error(getErrorMessage(error, "Could not load the menu"));
        }
    }

    const loadCartData = async (authToken) => {
        try {
            const response = await axios.post(url + "/api/cart/get", {}, { headers: { token: authToken } });
            if (response.data?.success) {
                setCartItems(response.data.cartData || {});
            }
        } catch (error) {
            if (isUnauthorized(error) || error?.response?.status === 404) {
                clearSession();
            } else {
                console.error(getErrorMessage(error, "Could not load your cart"));
            }
        }
    }

    useEffect(() => {
        async function loadData() {
            await fetchFoodList();
            const storedToken = localStorage.getItem("token");
            if (storedToken) {
                setToken(storedToken);
                await loadCartData(storedToken);
            }
        }
        loadData();
    }, [])

    const contextValue = {
        food_list,
        cartItems,
        setCartItems,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        url,
        token,
        setToken
    }

    return (
        <StoreContext.Provider value={contextValue}>
            {props.children}
        </StoreContext.Provider>
    )
}

export default StoreContextProvider;
