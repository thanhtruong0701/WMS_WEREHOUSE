import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Space, Select, Tag, Typography, Card, Row, Col, DatePicker, message, Popconfirm, Badge,
} from 'antd';
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { transactionsAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function TransactionsPage() {
    const { isStaff } = useAuth();
    const [txs, setTxs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({});

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const res = await transactionsAPI.list(filters);
            setTxs(res.data.data);
        } catch { message.error('Lỗi tải giao dịch'); }
        finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetch(); }, [filters]);

    const handleConfirm = async (tx) => {
        try {
            if (tx.category === 'material') await transactionsAPI.confirmMaterial(tx.id);
            else if (tx.category === 'fg_production') await transactionsAPI.confirmProduction(tx.id);
            else await transactionsAPI.confirmShipment(tx.id);
            message.success('Xác nhận thành công!');
            fetch();
        } catch (e) { message.error(e.response?.data?.message || 'Lỗi xác nhận'); }
    };

    const CATEGORY_LABEL = {
        material: { label: 'Vật Liệu', color: 'blue' },
        fg_production: { label: 'SX Nhập', color: 'green' },
        fg_shipment: { label: 'FG Xuất', color: 'orange' },
    };

    const columns = [
        {
            title: 'Phân loại', dataIndex: 'category', key: 'category', width: 110,
            render: v => <Tag color={CATEGORY_LABEL[v]?.color}>{CATEGORY_LABEL[v]?.label || v}</Tag>
        },
        {
            title: 'Loại', dataIndex: 'sub_type', key: 'sub_type', width: 80,
            render: (v, r) => {
                const isin = v === 'in';
                return <Tag color={isin ? 'success' : 'error'}>{isin ? '↑ Nhập' : '↓ Xuất'}</Tag>;
            }
        },
        { title: 'Mã SP', dataIndex: 'item_code', key: 'item_code', width: 120 },
        { title: 'Tên SP', dataIndex: 'item_name', key: 'item_name' },
        {
            title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100,
            render: (v, r) => <Text strong>{Number(v).toLocaleString()}</Text>
        },
        {
            title: 'Ngày GD', dataIndex: 'transaction_date', key: 'transaction_date', width: 100,
            render: v => dayjs(v).format('DD/MM/YYYY')
        },
        { title: 'Ref No', dataIndex: 'reference_no', key: 'reference_no', width: 130 },
        { title: 'Người tạo', dataIndex: 'created_by_name', key: 'created_by_name', width: 130 },
        {
            title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
            render: v => <Badge status={v === 'confirmed' ? 'success' : 'processing'} text={v === 'confirmed' ? 'Đã xác nhận' : 'Nháp'} />
        },
        ...(isStaff ? [{
            title: 'Thao tác', key: 'actions', width: 130, fixed: 'right',
            render: (_, r) => r.status !== 'confirmed' ? (
                <Popconfirm title="Xác nhận giao dịch này?" onConfirm={() => handleConfirm(r)} okText="Xác nhận" cancelText="Hủy">
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                        Xác nhận
                    </Button>
                </Popconfirm>
            ) : <Text type="secondary" style={{ fontSize: 12 }}>✅ Đã xong</Text>,
        }] : []),
    ];

    return (
        <div>
            <div className="page-header">
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>🔄 Quản Lý Giao Dịch</Title>
                <Button icon={<ReloadOutlined />} onClick={fetch}>Làm mới</Button>
            </div>

            <Card style={{ borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row gutter={[12, 8]}>
                    <Col xs={24} sm={8} md={5}>
                        <Select placeholder="Phân loại" allowClear style={{ width: '100%' }} onChange={v => setFilters(f => ({ ...f, type: v }))}>
                            <Select.Option value="material">Vật Liệu</Select.Option>
                            <Select.Option value="production">SX Nhập</Select.Option>
                            <Select.Option value="shipment">FG Xuất</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={8} md={5}>
                        <Select placeholder="Trạng thái" allowClear style={{ width: '100%' }} onChange={v => setFilters(f => ({ ...f, status: v }))}>
                            <Select.Option value="draft">Nháp</Select.Option>
                            <Select.Option value="confirmed">Đã xác nhận</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
                            onChange={dates => setFilters(f => ({
                                ...f,
                                date_from: dates?.[0]?.format('YYYY-MM-DD'),
                                date_to: dates?.[1]?.format('YYYY-MM-DD'),
                            }))} />
                    </Col>
                </Row>
            </Card>

            <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table columns={columns} dataSource={txs} rowKey="id" loading={loading}
                    scroll={{ x: 1000 }} size="middle"
                    pagination={{ pageSize: 30, showSizeChanger: true, showTotal: t => `Tổng ${t} giao dịch` }}
                />
            </Card>
        </div>
    );
}
