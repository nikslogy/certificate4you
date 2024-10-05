import React from 'react';
import { Navigate } from 'react-router-dom';

function PublicRoute({ children, isAuthenticated }) {
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
}

export default PublicRoute;