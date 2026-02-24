import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authAPI } from '../../api';

const { Title, Text } = Typography;

export default function ChangePasswordPage() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await authAPI.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
            });
            message.success('Đổi mật khẩu thành công');
            form.resetFields();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi đổi mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <Title level={2}>Đổi mật khẩu</Title>
            <Card style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >
                    <Form.Item
                        label="Mật khẩu hiện tại"
                        name="currentPassword"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu hiện tại" />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                            { min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
                    </Form.Item>

                    <Form.Item
                        label="Xác nhận mật khẩu mới"
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" loading={loading} block size="large">
                            Cập nhật mật khẩu
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
