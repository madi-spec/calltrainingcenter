import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CompanyProvider } from './context/CompanyContext';
import { ConfigProvider } from './context/ConfigContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider>
        <CompanyProvider>
          <App />
        </CompanyProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
