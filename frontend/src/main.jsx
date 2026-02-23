import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import App from './App';
import './index.css';

dayjs.locale('vi');

const theme = {
    token: {
        colorPrimary: '#1E3A5F',
        colorSuccess: '#52c41a',
        colorWarning: '#faad14',
        colorError: '#ff4d4f',
        borderRadius: 8,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    components: {
        Layout: {
            siderBg: '#0D1B2A',
            triggerBg: '#162535',
        },
        Menu: {
            darkItemBg: '#0D1B2A',
            darkSubMenuItemBg: '#162535',
            darkItemSelectedBg: '#1E3A5F',
        },
    },
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <ConfigProvider locale={viVN} theme={theme}>
        <App />
    </ConfigProvider>
);
