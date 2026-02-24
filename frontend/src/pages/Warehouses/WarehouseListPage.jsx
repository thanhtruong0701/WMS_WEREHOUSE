import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Space, Input, Select, Tag, Typography, Modal, Form,
    message, Popconfirm, Tooltip, Card, Row, Col, Badge,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined,
    HomeOutlined,
} from '@ant-design/icons';
import { warehousesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const WAREHOUSE_TYPES = {
    material: { label: 'Kho Nguyên Liệu', color: 'blue' },
    fg: { label: 'Kho Thành Phẩm', color: 'green' }
};

export default function WarehouseListPage() {
    const { isAdmin } = useAuth();
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState(null);
    const [form] = Form.useForm();

    const fetchWarehouses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await warehousesAPI.list({ type: typeFilter });
            // Manual search filtering if backend search isn't fully implemented for warehouses
            const filtered = res.data.data.filter(w =>
                w.code.toLowerCase().includes(search.toLowerCase()) ||
                w.name.toLowerCase().includes(search.toLowerCase())
            );
            setWarehouses(filtered);
        } catch (e) {
            message.error('Lỗi tải danh sách kho');
        } finally { setLoading(false); }
    }, [search, typeFilter]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    const handleSave = async (values) => {
        try {
            if (editingWarehouse) {
                await warehousesAPI.update(editingWarehouse.id, values);
                message.success('Cập nhật kho thành công');
            } else {
                await warehousesAPI.create(values);
                message.success('Tạo kho mới thành công');
            }
            setModalOpen(false);
            form.resetFields();
            setEditingWarehouse(null);
            fetchWarehouses();
        } catch (e) {
            message.error(e.response?.data?.message || 'Lỗi thao tác');
        }
    };

    const columns = [
        {
            title: 'Mã Kho', dataIndex: 'code', key: 'code', width: 120,
            render: v => <Text strong style={{ color: '#1E3A5F' }}>{v}</Text>
        },
        { title: 'Tên Kho', dataIndex: 'name', key: 'name', width: 200 },
        {
            title: 'Loại Kho', dataIndex: 'type', key: 'type', width: 150,
            render: v => <Tag color={WAREHOUSE_TYPES[v]?.color}>{WAREHOUSE_TYPES[v]?.label || v}</Tag>
        },
        { title: 'Địa điểm', dataIndex: 'location', key: 'location', width: 200 },
        {
            title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', width: 120,
            render: v => <Badge status={v ? 'success' : 'error'} text={v ? 'Hoạt động' : 'Dừng'} />
        },
        {
            title: 'Thao tác', key: 'actions', width: 100, fixed: 'right',
            render: (_, record) => (
                <Space size={8}>
                    <Tooltip title="Sửa">
                        <Button size="small" icon={<EditOutlined />}
                            onClick={() => { setEditingWarehouse(record); form.setFieldsValue(record); setModalOpen(true); }} />
                    </Tooltip>
                    {isAdmin && (
                        <Popconfirm
                            title="Xác nhận dừng hoạt động kho này?"
                            onConfirm={() => handleSave({ ...record, is_active: false })}
                            okText="Dừng" cancelText="Hủy"
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} disabled={!record.is_active} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div className="page-header">
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>🏠 Danh Mục Kho</Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchWarehouses}>Làm mới</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingWarehouse(null); form.resetFields(); setModalOpen(true); }}>
                        Thêm Kho
                    </Button>
                </Space>
            </div>

            <Card style={{ borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row gutter={[12, 8]}>
                    <Col xs={24} sm={12} md={8}>
                        <Input.Search
                            placeholder="Tìm theo mã / tên kho..."
                            allowClear
                            onSearch={v => setSearch(v)}
                            onChange={e => !e.target.value && setSearch('')}
                            prefix={<SearchOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Loại kho"
                            allowClear
                            style={{ width: '100%' }}
                            onChange={v => setTypeFilter(v)}
                        >
                            <Select.Option value="material">Kho Nguyên Liệu</Select.Option>
                            <Select.Option value="fg">Kho Thành Phẩm</Select.Option>
                        </Select>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table
                    columns={columns}
                    dataSource={warehouses}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    size="middle"
                />
            </Card>

            <Modal
                title={editingWarehouse ? 'Sửa Thông Tin Kho' : 'Thêm Kho Mới'}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingWarehouse(null); form.resetFields(); }}
                onOk={() => form.submit()}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Form.Item name="type" label="Loại Kho" rules={[{ required: true }]}>
                        <Select placeholder="Chọn loại kho">
                            <Select.Option value="material">Kho Nguyên Liệu</Select.Option>
                            <Select.Option value="fg">Kho Thành Phẩm</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="code" label="Mã Kho" rules={[{ required: true }]}>
                        <Input placeholder="WH-FG-03" disabled={!!editingWarehouse} />
                    </Form.Item>
                    <Form.Item name="name" label="Tên Kho" rules={[{ required: true }]}>
                        <Input placeholder="Kho Thành Phẩm C" />
                    </Form.Item>
                    <Form.Item name="location" label="Địa điểm">
                        <Input placeholder="Khu vực C, Tầng 2" />
                    </Form.Item>
                    <Form.Item name="description" label="Ghi chú">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    {editingWarehouse && (
                        <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                            <Select>
                                <Select.Option value={true}>Hoạt động</Select.Option>
                                <Select.Option value={false}>Ngừng hoạt động</Select.Option>
                            </Select>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
