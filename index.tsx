// index.tsx: The entry point for the React application.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StandardLoadsProvider } from './contexts/StandardLoadsContext';
import { AuthProvider } from './contexts/AuthContext';

// Find the root DOM element where the React app will be mounted.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create a React root and render the main App component.
const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
      <StandardLoadsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StandardLoadsProvider>
    </React.StrictMode>
);