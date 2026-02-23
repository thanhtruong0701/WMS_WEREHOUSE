import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Tag, Typography, Modal, Form, Input, Select,
    message, Popconfirm, Switch, Card, Badge,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { usersAPI } from '../../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const ROLE_COLORS = { admin: 'red', staff: 'blue', viewer: 'green' };
const ROLE_LABELS = { admin: 'Admin', staff: 'Nhân viên', viewer: 'Xem' };

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [pwModalOpen, setPwModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [form] = Form.useForm();
    const [pwForm] = Form.useForm();

    const fetch = async () => {
        setLoading(true);
        try { const res = await usersAPI.list(); setUsers(res.data.data); }
        catch { message.error('Lỗi tải users'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const handleSave = async (values) => {
        try {
            if (editingUser) {
                await usersAPI.update(editingUser.id, values);
                message.success('Cập nhật thành công');
            } else {
                await usersAPI.create(values);
                message.success('Tạo user thành công');
            }
            setModalOpen(false); form.resetFields(); setEditingUser(null); fetch();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
    };

    const handleDelete = async (id) => {
        try { await usersAPI.delete(id); message.success('Đã xóa'); fetch(); }
        catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
    };

    const handleResetPw = async (values) => {
        try {
            await usersAPI.resetPassword(selectedUser.id, { newPassword: values.newPassword });
            message.success('Reset mật khẩu thành công');
            setPwModalOpen(false); pwForm.resetFields();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
    };

    const columns = [
        { title: 'Username', dataIndex: 'username', key: 'username', render: v => <strong>{v}</strong> },
        { title: 'Họ tên', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Vai trò', dataIndex: 'role', key: 'role',
            render: v => <Tag color={ROLE_COLORS[v]}>{ROLE_LABELS[v]}</Tag>
        },
        {
            title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active',
            render: v => <Badge status={v ? 'success' : 'error'} text={v ? 'Hoạt động' : 'Vô hiệu'} />
        },
        {
            title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at',
            render: v => dayjs(v).format('DD/MM/YYYY')
        },
        {
            title: 'Thao tác', key: 'actions',
            render: (_, r) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />}
                        onClick={() => { setEditingUser(r); form.setFieldsValue({ full_name: r.full_name, role: r.role, is_active: r.is_active }); setModalOpen(true); }} />
                    <Button size="small" icon={<KeyOutlined />}
                        onClick={() => { setSelectedUser(r); pwForm.resetFields(); setPwModalOpen(true); }} />
                    <Popconfirm title="Xóa user này?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div className="page-header">
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>👥 Quản Lý Users</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setModalOpen(true); }}>
                    Thêm User
                </Button>
            </div>
            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table columns={columns} dataSource={users} rowKey="id" loading={loading}
                    pagination={{ pageSize: 20, showTotal: t => `Tổng ${t} users` }} />
            </Card>

            <Modal title={editingUser ? 'Sửa User' : 'Thêm User'} open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}
                onOk={() => form.submit()} okText="Lưu" cancelText="Hủy">
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    {!editingUser && (
                        <>
                            <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input /></Form.Item>
                            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
                            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
                        </>
                    )}
                    <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="admin">Admin</Select.Option>
                            <Select.Option value="staff">Nhân viên kho</Select.Option>
                            <Select.Option value="viewer">Xem</Select.Option>
                        </Select>
                    </Form.Item>
                    {editingUser && (
                        <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                            <Switch checkedChildren="Hoạt động" unCheckedChildren="Vô hiệu" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            <Modal title={`Reset mật khẩu: ${selectedUser?.username}`} open={pwModalOpen}
                onCancel={() => setPwModalOpen(false)} onOk={() => pwForm.submit()} okText="Reset" cancelText="Hủy">
                <Form form={pwForm} layout="vertical" onFinish={handleResetPw}>
                    <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
                    <Form.Item name="confirm" label="Xác nhận mật khẩu" dependencies={['newPassword']}
                        rules={[{ required: true }, ({ getFieldValue }) => ({
                            validator(_, v) {
                                if (!v || getFieldValue('newPassword') === v) return Promise.resolve();
                                return Promise.reject(new Error('Mật khẩu không khớp'));
                            },
                        })]}>
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
