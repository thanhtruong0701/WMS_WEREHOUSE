import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    Layout, Menu, Avatar, Dropdown, Badge, Tooltip, Typography, Space,
} from 'antd';
import {
    DashboardOutlined, AppstoreOutlined, GoldOutlined, SwapOutlined,
    TeamOutlined, AuditOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
    UserOutlined, LogoutOutlined, KeyOutlined, BellOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENU_ITEMS = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/materials', icon: <AppstoreOutlined />, label: 'Nguyên Vật Liệu' },
    { key: '/fg-products', icon: <GoldOutlined />, label: 'Thành Phẩm (FG)' },
    { key: '/transactions', icon: <SwapOutlined />, label: 'Giao Dịch' },
];

const ADMIN_MENU_ITEMS = [
    { key: '/users', icon: <TeamOutlined />, label: 'Quản Lý Users' },
    { key: '/audit-log', icon: <AuditOutlined />, label: 'Audit Log' },
];

const ROLE_COLORS = { admin: '#f5222d', staff: '#1E3A5F', viewer: '#52c41a' };
const ROLE_LABELS = { admin: 'Admin', staff: 'Nhân Viên', viewer: 'Xem' };

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const userMenuItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Thông tin tài khoản' },
        { key: 'password', icon: <KeyOutlined />, label: 'Đổi mật khẩu' },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
    ];

    const handleUserMenu = ({ key }) => {
        if (key === 'logout') { logout(); navigate('/login'); }
    };

    const menuItems = [
        ...MENU_ITEMS,
        ...(isAdmin ? [
            { type: 'divider' },
            { key: 'admin-group', type: 'group', label: 'Quản Trị', children: ADMIN_MENU_ITEMS },
        ] : []),
    ];

    const selectedKey = menuItems
        .flatMap(i => i.children || [i])
        .find(i => i.key && location.pathname.startsWith(i.key) && i.key !== '/')?.key
        || (location.pathname === '/' ? '/' : undefined);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                trigger={null}
                width={240}
                style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflowY: 'auto' }}
            >
                <div className="logo-area">
                    {collapsed ? (
                        <Text style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>W</Text>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div className="logo-text">🏭 WMS</div>
                            <div className="logo-sub">Warehouse Management</div>
                        </div>
                    )}
                </div>

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey || '/']}
                    defaultOpenKeys={['admin-group']}
                    items={menuItems}
                    onClick={({ key }) => navigate(key)}
                    style={{ borderRight: 0, paddingTop: 8 }}
                />
            </Sider>

            <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
                <Header style={{
                    position: 'sticky', top: 0, zIndex: 99,
                    background: '#fff', padding: '0 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                    <Space>
                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                            onClick: () => setCollapsed(!collapsed),
                            style: { fontSize: 18, cursor: 'pointer', color: '#555' },
                        })}
                    </Space>

                    <Space size={16}>
                        <Tooltip title="Thông báo">
                            <Badge count={3} size="small">
                                <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#555' }} />
                            </Badge>
                        </Tooltip>

                        <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar style={{ background: ROLE_COLORS[user?.role] || '#1E3A5F' }}>
                                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                </Avatar>
                                <div style={{ lineHeight: 1.2 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.fullName}</div>
                                    <div style={{ fontSize: 11, color: ROLE_COLORS[user?.role] }}>
                                        {ROLE_LABELS[user?.role]}
                                    </div>
                                </div>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                <Content style={{ margin: '16px', overflow: 'initial' }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
