import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Space, Input, Select, Tag, Typography, Modal, Form,
    InputNumber, message, Popconfirm, Tooltip, DatePicker, Card, Row, Col, Upload, Badge,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ImportOutlined,
    ExportOutlined, ArrowUpOutlined, ArrowDownOutlined, SearchOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { fgAPI, warehousesAPI, excelAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function FGListPage() {
    const { isStaff, isAdmin } = useAuth();
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    const [filters, setFilters] = useState({});
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [txModalOpen, setTxModalOpen] = useState(false);
    const [txType, setTxType] = useState('production');
    const [selectedFG, setSelectedFG] = useState(null);
    const [editingFG, setEditingFG] = useState(null);
    const [form] = Form.useForm();
    const [txForm] = Form.useForm();
    const [txLoading, setTxLoading] = useState(false);

    const fetchProducts = useCallback(async (page = 1, limit = 20) => {
        setLoading(true);
        try {
            const res = await fgAPI.list({ page, limit, search, ...filters });
            setProducts(res.data.data);
            setTotal(res.data.meta?.total || res.data.data.length);
        } catch { message.error('Lỗi tải dữ liệu'); }
        finally { setLoading(false); }
    }, [search, filters]);

    useEffect(() => {
        warehousesAPI.list({ type: 'fg' }).then(r => setWarehouses(r.data.data));
        fetchProducts();
    }, []);

    useEffect(() => { fetchProducts(pagination.current, pagination.pageSize); }, [filters, search]);

    const handleSave = async (values) => {
        try {
            if (editingFG) {
                await fgAPI.update(editingFG.id, values);
                message.success('Cập nhật thành công');
            } else {
                await fgAPI.create(values);
                message.success('Tạo mới thành công');
            }
            setModalOpen(false); form.resetFields(); setEditingFG(null); fetchProducts();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
    };

    const handleDelete = async (id) => {
        try { await fgAPI.delete(id); message.success('Đã xóa'); fetchProducts(); }
        catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
    };

    const openTxModal = (fg, type) => {
        setSelectedFG(fg); setTxType(type);
        txForm.resetFields();
        txForm.setFieldsValue({ unit: fg.unit, warehouse_id: fg.warehouse_id });
        setTxModalOpen(true);
    };

    const handleTransaction = async (values) => {
        setTxLoading(true);
        try {
            const data = { ...values, transaction_date: values.transaction_date?.format('YYYY-MM-DD') };
            if (txType === 'production') await fgAPI.productionIn(selectedFG.id, data);
            else await fgAPI.shipmentOut(selectedFG.id, data);
            message.success('Tạo phiếu thành công');
            setTxModalOpen(false); fetchProducts();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi'); }
        finally { setTxLoading(false); }
    };

    const handleExport = async () => {
        try {
            const res = await excelAPI.exportFG();
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url;
            a.download = `IOS_FG_${dayjs().format('YYYYMMDD')}.xlsx`; a.click();
        } catch { message.error('Lỗi xuất Excel'); }
    };

    const handleImport = async (file) => {
        const fd = new FormData(); fd.append('file', file);
        try { const res = await excelAPI.importFG(fd); message.success(res.data.message); fetchProducts(); }
        catch (e) { message.error(e.response?.data?.message || 'Lỗi import'); }
        return false;
    };

    const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'];
    const SIZE_COLORS = { XS: 'cyan', S: 'blue', M: 'geekblue', L: 'purple', XL: 'magenta', '2XL': 'red', '3XL': 'volcano' };

    const columns = [
        {
            title: 'Mã FG', dataIndex: 'code', key: 'code', fixed: 'left', width: 110,
            render: v => <Text strong style={{ color: '#217346' }}>{v}</Text>
        },
        { title: 'Tên SP', dataIndex: 'name', key: 'name', width: 200 },
        { title: 'Khách hàng', dataIndex: 'customer', key: 'customer', width: 150 },
        { title: 'Order No', dataIndex: 'order_no', key: 'order_no', width: 130 },
        {
            title: 'Size', dataIndex: 'size', key: 'size', width: 70,
            render: v => <Tag color={SIZE_COLORS[v] || 'default'}>{v}</Tag>
        },
        { title: 'Màu', dataIndex: 'color', key: 'color', width: 100 },
        { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 70 },
        {
            title: 'Tồn kho', dataIndex: 'current_stock', key: 'current_stock', width: 100,
            render: (v, r) => {
                const stock = parseFloat(v || 0);
                const isLow = stock <= parseFloat(r.low_stock_threshold || 0);
                return <Tag color={isLow ? 'red' : 'green'}>{stock.toLocaleString()}</Tag>;
            }
        },
        { title: 'Kho', dataIndex: 'warehouse_name', key: 'warehouse_name', width: 140 },
        {
            title: 'Thao tác', key: 'actions', fixed: 'right', width: 190,
            render: (_, record) => (
                <Space size={4}>
                    {isStaff && (
                        <>
                            <Tooltip title="Nhập từ SX">
                                <Button size="small" style={{ background: '#217346', borderColor: '#217346', color: '#fff' }}
                                    icon={<ArrowUpOutlined />} onClick={() => openTxModal(record, 'production')} />
                            </Tooltip>
                            <Tooltip title="Xuất shipment">
                                <Button size="small" danger ghost icon={<ArrowDownOutlined />}
                                    onClick={() => openTxModal(record, 'shipment')} />
                            </Tooltip>
                            <Button size="small" icon={<EditOutlined />}
                                onClick={() => { setEditingFG(record); form.setFieldsValue(record); setModalOpen(true); }} />
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
                <Title level={2} style={{ margin: 0, color: '#217346' }}>📦 Kho Thành Phẩm (FG)</Title>
                <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchProducts()}>Làm mới</Button>
                    <Button icon={<ExportOutlined />} onClick={handleExport}>Xuất Excel</Button>
                    {isStaff && (
                        <Upload showUploadList={false} beforeUpload={handleImport} accept=".xlsx,.xls">
                            <Button icon={<ImportOutlined />}>Import Excel</Button>
                        </Upload>
                    )}
                    {isStaff && (
                        <Button type="primary" icon={<PlusOutlined />} style={{ background: '#217346' }}
                            onClick={() => { setEditingFG(null); form.resetFields(); setModalOpen(true); }}>
                            Thêm FG
                        </Button>
                    )}
                </Space>
            </div>

            <Card style={{ borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row gutter={[12, 8]}>
                    <Col xs={24} sm={12} md={8}>
                        <Input.Search placeholder="Tìm mã / tên FG..." allowClear onSearch={v => setSearch(v)}
                            onChange={e => !e.target.value && setSearch('')} prefix={<SearchOutlined />} />
                    </Col>
                    <Col xs={12} md={5}>
                        <Input placeholder="Khách hàng" allowClear onChange={e => setFilters(f => ({ ...f, customer: e.target.value }))} />
                    </Col>
                    <Col xs={12} md={5}>
                        <Input placeholder="Order No" allowClear onChange={e => setFilters(f => ({ ...f, order_no: e.target.value }))} />
                    </Col>
                    <Col xs={12} md={3}>
                        <Select placeholder="Kho FG" allowClear style={{ width: '100%' }} onChange={v => setFilters(f => ({ ...f, warehouse_id: v }))}>
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>)}
                        </Select>
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table columns={columns} dataSource={products} rowKey="id" loading={loading}
                    scroll={{ x: 1150 }} size="middle"
                    pagination={{
                        current: pagination.current, pageSize: pagination.pageSize, total,
                        showSizeChanger: true, showTotal: t => `Tổng ${t} records`,
                        onChange: (page, size) => { setPagination({ current: page, pageSize: size }); fetchProducts(page, size); }
                    }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal title={editingFG ? 'Sửa FG Product' : 'Thêm FG Product'} open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditingFG(null); form.resetFields(); }}
                onOk={() => form.submit()} width={680} okText="Lưu" cancelText="Hủy">
                <Form form={form} layout="vertical" onFinish={handleSave}>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="code" label="Mã FG" rules={[{ required: true }]}><Input disabled={!!editingFG} /></Form.Item></Col>
                        <Col span={16}><Form.Item name="name" label="Tên SP" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="customer" label="Khách hàng"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="order_no" label="Order No"><Input /></Form.Item></Col>
                        <Col span={8}>
                            <Form.Item name="size" label="Size">
                                <Select allowClear>{SIZES.map(s => <Select.Option key={s}>{s}</Select.Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}><Form.Item name="color" label="Màu sắc"><Input /></Form.Item></Col>
                        <Col span={8}>
                            <Form.Item name="unit" label="ĐVT" rules={[{ required: true }]}>
                                <Select><Select.Option value="PCS">PCS</Select.Option></Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="warehouse_id" label="Kho">
                                <Select allowClear>{warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>)}</Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}><Form.Item name="low_stock_threshold" label="Ngưỡng tối thiểu"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>

            {/* Transaction Modal */}
            <Modal
                title={txType === 'production' ? `📥 Nhập từ SX: ${selectedFG?.name}` : `🚢 Xuất Shipment: ${selectedFG?.name}`}
                open={txModalOpen} onCancel={() => setTxModalOpen(false)} onOk={() => txForm.submit()}
                okText="Xác nhận" cancelText="Hủy" confirmLoading={txLoading}
                okButtonProps={{ style: { background: txType === 'production' ? '#217346' : '#ff4d4f', borderColor: txType === 'production' ? '#217346' : '#ff4d4f' } }}>
                <Form form={txForm} layout="vertical" onFinish={handleTransaction}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="quantity" label="Số lượng (PCS)" rules={[{ required: true, type: 'number', min: 1 }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="unit" label="ĐVT" rules={[{ required: true }]}><Select><Select.Option value="PCS">PCS</Select.Option></Select></Form.Item></Col>
                        <Col span={12}><Form.Item name="transaction_date" label="Ngày" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" defaultValue={dayjs()} /></Form.Item></Col>
                        <Col span={12}>
                            <Form.Item name={txType === 'production' ? 'production_order_no' : 'shipment_no'} label={txType === 'production' ? 'Lệnh SX' : 'Số Shipment'}>
                                <Input />
                            </Form.Item>
                        </Col>
                        {txType === 'shipment' && (
                            <><Col span={12}><Form.Item name="customer" label="Khách hàng"><Input defaultValue={selectedFG?.customer} /></Form.Item></Col>
                                <Col span={12}><Form.Item name="invoice_no" label="Số Invoice"><Input /></Form.Item></Col></>
                        )}
                        <Col span={24}><Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item></Col>
                    </Row>
                    {txType === 'shipment' && selectedFG && (
                        <Tag color="orange">Tồn hiện tại: {parseFloat(selectedFG.current_stock || 0).toLocaleString()} PCS</Tag>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
