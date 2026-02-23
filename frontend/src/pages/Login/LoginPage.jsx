import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';

const { Title, Text } = Typography;

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (values) => {
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.login(values);
            const { token, user } = res.data.data;
            login(token, user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0D1B2A 0%, #1E3A5F 50%, #2E6BA8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
        }}>
            {/* Background pattern */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.05,
                backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%)',
                backgroundSize: '50px 50px',
            }} />

            <div style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)',
                borderRadius: 20,
                padding: '48px 40px',
                width: '100%',
                maxWidth: 440,
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
                position: 'relative',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'linear-gradient(135deg, #1E3A5F, #2E6BA8)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 32, marginBottom: 16,
                        boxShadow: '0 8px 24px rgba(30,58,95,0.3)',
                    }}>
                        🏭
                    </div>
                    <Title level={2} style={{ margin: 0, color: '#1E3A5F', fontSize: 26 }}>
                        WMS System
                    </Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        Quản lý xuất nhập tồn kho
                    </Text>
                </div>

                {error && (
                    <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 10 }} closable onClose={() => setError('')} />
                )}

                <Spin spinning={loading}>
                    <Form layout="vertical" onFinish={handleLogin} size="large" autoComplete="on">
                        <Form.Item
                            name="username"
                            label={<span style={{ fontWeight: 600 }}>Tên đăng nhập</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#bbb' }} />}
                                placeholder="admin / staff01 / viewer01"
                                style={{ borderRadius: 10 }}
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label={<span style={{ fontWeight: 600 }}>Mật khẩu</span>}
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bbb' }} />}
                                placeholder="Mật khẩu"
                                style={{ borderRadius: 10 }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                loading={loading}
                                size="large"
                                style={{
                                    borderRadius: 10, height: 48, fontSize: 16, fontWeight: 600,
                                    background: 'linear-gradient(135deg, #1E3A5F, #2E6BA8)',
                                    border: 'none',
                                }}
                            >
                                Đăng Nhập
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>

                <div style={{ marginTop: 24, padding: '16px', background: '#f8f9fa', borderRadius: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <strong>Tài khoản mặc định:</strong><br />
                        admin / password | staff01 / password | viewer01 / password
                    </Text>
                </div>
            </div>
        </div>
    );
}
