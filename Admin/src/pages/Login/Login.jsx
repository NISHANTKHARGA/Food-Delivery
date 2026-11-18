import React, { useState } from 'react'
import './Login.css'
import axios, { API_URL, getErrorMessage } from '../../utils/api'

const Login = ({ onLogin }) => {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const onSubmitHandler = async (event) => {
        event.preventDefault()
        if (submitting) return

        setSubmitting(true)
        setError("")

        try {
            const response = await axios.post(`${API_URL}/api/user/admin/login`, {
                email: email.trim(),
                password,
            })

            if (response.data?.success && response.data.token) {
                onLogin(response.data.token)
            } else {
                setError(response.data?.message || "Invalid credentials")
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to sign in"))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className='admin-login'>
            <form className='admin-login-container' onSubmit={onSubmitHandler}>
                <h2>Admin Login</h2>
                <p>Sign in to manage the menu and orders.</p>
                <div className="admin-login-inputs">
                    <input
                        type="email"
                        name="email"
                        placeholder="Admin email"
                        autoComplete="username"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                </div>
                {error ? <p className='admin-login-error'>{error}</p> : null}
                <button type="submit" disabled={submitting}>
                    {submitting ? "Signing in..." : "Login"}
                </button>
            </form>
        </div>
    )
}

export default Login
