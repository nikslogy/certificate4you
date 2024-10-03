import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

function Login({ setIsAuthenticated }) {
  const [formData, setFormData] = useState({ email: '', password: '', otp: '', newPassword: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/.netlify/functions/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('token', result.token);
        setIsAuthenticated(true);
        setSuccess('Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to login');
      }
    } catch (error) {
      setError('Failed to login. Please try again.');
    }
  };

  const handleForgotPasswordClick = () => {
    setForgotPassword(true);
    setOtpSent(false);
    setError(null);
    setSuccess(false);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please enter your email address.');
      return;
    }

    try {
      const response = await fetch('/.netlify/functions/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setOtpSent(true);
        setSuccess('OTP sent successfully. Please check your email.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError(error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        setSuccess('Password reset successfully. Please login with your new password.');
        setTimeout(() => {
          setForgotPassword(false);
          setOtpSent(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      setError(error.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className={`auth-container ${success ? 'success' : ''}`}>
      <h1>{forgotPassword ? 'Reset Password' : 'Login'}</h1>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message show">{success}</div>}
      {!forgotPassword ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group1">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder=" "
            />
            <label htmlFor="email">Email</label>
          </div>
          <div className="form-group1">
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder=" "
            />
            <label htmlFor="password">Password</label>
          </div>
          <button type="submit" className="auth-button">Login</button>
        </form>
      ) : (
        <form onSubmit={otpSent ? handleResetPassword : handleSendOtp} className="auth-form">
          <div className="form-group1">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder=" "
            />
            <label htmlFor="email">Email</label>
          </div>
          {otpSent && (
            <>
              <div className="form-group1">
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="otp">OTP</label>
              </div>
              <div className="form-group1">
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  placeholder=" "
                />
                <label htmlFor="newPassword">New Password</label>
              </div>
            </>
          )}
          <button type="submit" className="auth-button">
            {otpSent ? 'Reset Password' : 'Send OTP'}
          </button>
        </form>
      )}
      <div className="auth-links">
        {!forgotPassword ? (
          <>
            <p className="auth-link">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
            <p className="auth-link">
              <button onClick={handleForgotPasswordClick} className="link-button">Forgot password?</button>
            </p>
          </>
        ) : (
          <p className="auth-link">
            <button onClick={() => setForgotPassword(false)} className="link-button">Back to Login</button>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;