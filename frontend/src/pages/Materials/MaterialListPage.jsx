import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Space, Input, Select, Tag, Typography, Modal, Form,
    InputNumber, message, Popconfirm, Tooltip, DatePicker, Card, Row, Col, Upload, Badge,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined,
    ExportOutlined, ArrowUpOutlined, ArrowDownOutlined, SearchOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { materialsAPI, warehousesAPI, excelAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS = { confirmed: 'success', draft: 'processing' };

export default function MaterialListPage() {
    const { isStaff, isAdmin } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    const [filters, setFilters] = useState({});
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [txModalOpen, setTxModalOpen] = useState(false);
    const [txType, setTxType] = useState('in');
    const [selectedMat, setSelectedMat] = useState(null);
    const [editingMat, setEditingMat] = useState(null);
    const [form] = Form.useForm();
    const [txForm] = Form.useForm();
    const [txLoading, setTxLoading] = useState(false);

    const fetchMaterials = useCallback(async (page = 1, limit = 20) => {
        setLoading(true);
        try {
            const res = await materialsAPI.list({ page, limit, search, ...filters });
            setMaterials(res.data.data);
            setTotal(res.data.meta.total);
        } catch (e) {
            message.error('Lỗi tải dữ liệu');
        } finally { setLoading(false); }
    }, [search, filters]);

    useEffect(() => {
        warehousesAPI.list({ type: 'material' }).then(r => setWarehouses(r.data.data));
        fetchMaterials();
    }, []);

    useEffect(() => {
        fetchMaterials(pagination.current, pagination.pageSize);
    }, [filters, search]);

    const handleSave = async (values) => {
        try {
            if (editingMat) {
                await materialsAPI.update(editingMat.id, values);
                message.success('Cập nhật thành công');
            } else {
                await materialsAPI.create(values);
                message.success('Tạo mới thành công');
            }
            setModalOpen(false);
            form.resetFields();
            setEditingMat(null);
            fetchMaterials();
        } catch (e) {
            message.error(e.response?.data?.message || 'Lỗi');
        }
    };

    const handleDelete = async (id) => {
        try {
            await materialsAPI.delete(id);
            message.success('Đã xóa');
            fetchMaterials();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
    };

    const openTxModal = (mat, type) => {
        setSelectedMat(mat);
        setTxType(type);
        txForm.resetFields();
        txForm.setFieldsValue({ unit: mat.unit, warehouse_id: mat.warehouse_id });
        setTxModalOpen(true);
    };

    const handleTransaction = async (values) => {
        setTxLoading(true);
        try {
            const data = { ...values, transaction_date: values.transaction_date?.format('YYYY-MM-DD') };
            if (txType === 'in') await materialsAPI.stockIn(selectedMat.id, data);
            else await materialsAPI.stockOut(selectedMat.id, data);
            message.success(`Tạo phiếu ${txType === 'in' ? 'nhập' : 'xuất'} thành công`);
            setTxModalOpen(false);
            fetchMaterials();
        } catch (e) {
            message.error(e.response?.data?.message || 'Lỗi tạo phiếu');
        } finally { setTxLoading(false); }
    };

    const handleExport = async () => {
        try {
            const res = await excelAPI.exportMaterial();
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `IOS_Material_${dayjs().format('YYYYMMDD')}.xlsx`;
            a.click();
        } catch (e) { message.error('Lỗi xuất Excel'); }
    };

    const handleImport = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await excelAPI.importMaterial(formData);
            message.success(res.data.message);
            fetchMaterials();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi import'); }
        return false;
    };

    const columns = [
        {
            title: 'Mã NVL', dataIndex: 'code', key: 'code', fixed: 'left', width: 120,
            render: v => <Text strong style={{ color: '#1E3A5F' }}>{v}</Text>
        },
        { title: 'Tên NVL', dataIndex: 'name', key: 'name', width: 200 },
        { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 70 },
        { title: 'Nhà cung cấp', dataIndex: 'supplier', key: 'supplier', width: 180 },
        { title: 'Vị trí', dataIndex: 'warehouse_location', key: 'warehouse_location', width: 100 },
        { title: 'Kho', dataIndex: 'warehouse_name', key: 'warehouse_name', width: 140 },
        {
            title: 'Tồn kho', dataIndex: 'current_stock', key: 'current_stock', width: 110,
            render: (v, r) => {
                const stock = parseFloat(v || 0);
                const isLow = stock <= parseFloat(r.low_stock_threshold || 0);
                return <Tag color={isLow ? 'red' : 'green'}>{stock.toLocaleString()}</Tag>;
            }
        },
        {
            title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', width: 100,
            render: v => <Badge status={v ? 'success' : 'error'} text={v ? 'Hoạt động' : 'Dừng'} />
        },
        {
            title: 'Thao tác', key: 'actions', fixed: 'right', width: 190,
            render: (_, record) => (
                <Space size={4}>
                    {isStaff && (
                        <>
                            <Tooltip title="Nhập kho">
                                <Button size="small" type="primary" ghost icon={<ArrowUpOutlined />}
                                    onClick={() => openTxModal(record, 'in')} />
                            </Tooltip>
                            <Tooltip title="Xuất kho">
                                <Button size="small" danger ghost icon={<ArrowDownOutlined />}
                                    onClick={() => openTxModal(record, 'out')} />
                            </Tooltip>
                            <Tooltip title="Sửa">
                                <Button size="small" icon={<EditOutlined />}
                                    onClick={() => { setEditingMat(record); form.setFieldsValue(record); setModalOpen(true); }} />
                            </Tooltip>
                        </>
                    )}
                    {isAdmin && (
                        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div className="page-header">
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>🏗️ Kho Nguyên Vật Liệu</Title>
                <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchMaterials()}>Làm mới</Button>
                    <Button icon={<ExportOutlined />} onClick={handleExport}>Xuất Excel</Button>
                    {isStaff && (
                        <Upload showUploadList={false} beforeUpload={handleImport} accept=".xlsx,.xls">
                            <Button icon={<ImportOutlined />}>Import Excel</Button>
                        </Upload>
                    )}
                    {isStaff && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingMat(null); form.resetFields(); setModalOpen(true); }}>
                            Thêm NVL
                        </Button>
                    )}
                </Space>
            </div>

            {/* Filters */}
            <Card style={{ borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row gutter={[12, 8]} align="middle">
                    <Col xs={24} sm={12} md={8}>
                        <Input.Search
                            placeholder="Tìm theo mã / tên NVL..."
                            allowClear
                            onSearch={v => setSearch(v)}
                            onChange={e => !e.target.value && setSearch('')}
                            prefix={<SearchOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Input placeholder="Nhà cung cấp" allowClear onChange={e => setFilters(f => ({ ...f, supplier: e.target.value }))} />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select placeholder="Kho" allowClear style={{ width: '100%' }}
                            onChange={v => setFilters(f => ({ ...f, warehouse_id: v }))}>
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={4}>
                        <Select placeholder="Lọc tồn" allowClear style={{ width: '100%' }}
                            onChange={v => setFilters(f => ({ ...f, low_stock: v }))}>
                            <Select.Option value="true">⚠️ Sắp hết</Select.Option>
                        </Select>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table
                    columns={columns}
                    dataSource={materials}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1100 }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total,
                        showSizeChanger: true,
                        showTotal: (t) => `Tổng ${t} records`,
                        onChange: (page, size) => { setPagination({ current: page, pageSize: size }); fetchMaterials(page, size); },
                    }}
                    size="middle"
                    rowClassName={(r) => parseFloat(r.current_stock || 0) <= parseFloat(r.low_stock_threshold || 0) ? 'ant-table-row-danger' : ''}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingMat ? 'Sửa Nguyên Vật Liệu' : 'Thêm Nguyên Vật Liệu'}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingMat(null); form.resetFields(); }}
                onOk={() => form.submit()}
                width={640}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="Mã NVL" rules={[{ required: true }]}>
                                <Input disabled={!!editingMat} placeholder="MAT-001" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true }]}>
                                <Select>
                                    {['KG', 'M', 'Cái', 'Cuộn', 'Hộp', 'Lít', 'PCS'].map(u => <Select.Option key={u}>{u}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="name" label="Tên NVL" rules={[{ required: true }]}>
                                <Input placeholder="Vải Cotton 30/1" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="supplier" label="Nhà cung cấp">
                                <Input placeholder="Công ty ABC" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="warehouse_id" label="Kho">
                                <Select allowClear placeholder="Chọn kho">
                                    {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="warehouse_location" label="Vị trí trong kho">
                                <Input placeholder="A1-01" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="low_stock_threshold" label="Ngưỡng tồn tối thiểu">
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>

            {/* Transaction Modal */}
            <Modal
                title={txType === 'in' ? `📥 Nhập Kho: ${selectedMat?.name}` : `📤 Xuất Kho: ${selectedMat?.name}`}
                open={txModalOpen}
                onCancel={() => setTxModalOpen(false)}
                onOk={() => txForm.submit()}
                okText="Xác nhận"
                cancelText="Hủy"
                confirmLoading={txLoading}
                okButtonProps={{ style: { background: txType === 'in' ? '#52c41a' : '#ff4d4f', borderColor: txType === 'in' ? '#52c41a' : '#ff4d4f' } }}
            >
                <Form form={txForm} layout="vertical" onFinish={handleTransaction}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Số lượng" rules={[{ required: true, type: 'number', min: 0.001 }]}>
                                <InputNumber min={0.001} step={0.001} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="unit" label="ĐVT" rules={[{ required: true }]}>
                                <Select><Select.Option value={selectedMat?.unit}>{selectedMat?.unit}</Select.Option></Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="transaction_date" label="Ngày" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" defaultValue={dayjs()} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="reference_no" label={txType === 'in' ? 'Số PO' : 'Số phiếu xuất'}>
                                <Input placeholder="PO-2025-001" />
                            </Form.Item>
                        </Col>
                        {txType === 'in' && (
                            <Col span={24}>
                                <Form.Item name="supplier" label="Nhà cung cấp">
                                    <Input placeholder={selectedMat?.supplier} />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={24}>
                            <Form.Item name="warehouse_id" label="Kho">
                                <Select allowClear placeholder="Chọn kho">
                                    {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="note" label="Ghi chú">
                                <Input.TextArea rows={2} />
                            </Form.Item>
                        </Col>
                    </Row>
                    {txType === 'out' && selectedMat && (
                        <Tag color="orange" style={{ marginBottom: 8 }}>
                            Tồn hiện tại: {parseFloat(selectedMat.current_stock || 0).toLocaleString()} {selectedMat.unit}
                        </Tag>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
