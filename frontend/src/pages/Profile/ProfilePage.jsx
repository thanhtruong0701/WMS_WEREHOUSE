import React from 'react';
import { Card, Descriptions, Tag, Avatar, Typography, Row, Col, Space } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title } = Typography;

const ROLE_LABELS = { admin: 'Quản trị viên', staff: 'Nhân viên kho', viewer: 'Người xem' };
const ROLE_COLORS = { admin: 'red', staff: 'blue', viewer: 'green' };

export default function ProfilePage() {
    const { user } = useAuth();

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Title level={2}>Thông tin tài khoản</Title>
            <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Row gutter={24} align="middle">
                    <Col xs={24} sm={8} style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Avatar
                            size={120}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: ROLE_COLORS[user?.role] || '#1E3A5F' }}
                        />
                        <div style={{ marginTop: 16 }}>
                            <Tag color={ROLE_COLORS[user?.role]} style={{ borderRadius: 10 }}>
                                {ROLE_LABELS[user?.role] || user?.role}
                            </Tag>
                        </div>
                    </Col>
                    <Col xs={24} sm={16}>
                        <Descriptions
                            bordered
                            column={1}
                            size="large"
                            labelStyle={{ fontWeight: 600, width: 150 }}
                        >
                            <Descriptions.Item label="Họ và tên">
                                {user?.fullName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tên đăng nhập">
                                {user?.username}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                                <Space>
                                    <MailOutlined style={{ color: '#1E3A5F' }} />
                                    {user?.email || 'N/A'}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Quyền hạn">
                                {ROLE_LABELS[user?.role]}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color="success">Đang hoạt động</Tag>
                            </Descriptions.Item>
                        </Descriptions>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}
