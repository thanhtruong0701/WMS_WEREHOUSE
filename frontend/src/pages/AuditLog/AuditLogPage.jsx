import React, { useState, useEffect } from 'react';
import { Table, Typography, Select, Input, Card, Row, Col, Tag, DatePicker } from 'antd';
import { warehousesAPI } from '../../api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLORS = {
    CREATE: 'green', UPDATE: 'blue', DELETE: 'red',
    STOCK_IN: 'cyan', STOCK_OUT: 'orange',
    PRODUCTION_IN: 'purple', SHIPMENT_OUT: 'gold',
    CONFIRM: 'geekblue',
};

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({});

    const fetch = async (page = 1, limit = 50) => {
        setLoading(true);
        try {
            const res = await warehousesAPI.getAuditLogs({ page, limit, ...filters });
            setLogs(res.data.data);
            setTotal(res.data.meta?.total || 0);
        } catch { }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, [filters]);

    const columns = [
        {
            title: 'Thời gian', dataIndex: 'created_at', key: 'created_at', width: 160,
            render: v => dayjs(v).format('DD/MM/YYYY HH:mm:ss')
        },
        { title: 'Người dùng', dataIndex: 'username', key: 'username', width: 120 },
        {
            title: 'Hành động', dataIndex: 'action', key: 'action', width: 140,
            render: v => <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag>
        },
        { title: 'Bảng', dataIndex: 'table_name', key: 'table_name', width: 160 },
        {
            title: 'Record ID', dataIndex: 'record_id', key: 'record_id', width: 100,
            render: v => v ? <Tag>{String(v).substring(0, 8)}...</Tag> : '-'
        },
        { title: 'IP', dataIndex: 'ip_address', key: 'ip_address', width: 120 },
    ];

    return (
        <div>
            <div className="page-header">
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>📋 Audit Log</Title>
            </div>

            <Card style={{ borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row gutter={[12, 8]}>
                    <Col xs={24} sm={8} md={5}>
                        <Select placeholder="Bảng dữ liệu" allowClear style={{ width: '100%' }}
                            onChange={v => setFilters(f => ({ ...f, table_name: v }))}>
                            {['materials', 'fg_products', 'inventory_transactions', 'production_transactions', 'shipment_transactions', 'users'].map(t =>
                                <Select.Option key={t} value={t}>{t}</Select.Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={8} md={5}>
                        <Select placeholder="Hành động" allowClear style={{ width: '100%' }}
                            onChange={v => setFilters(f => ({ ...f, action: v }))}>
                            {Object.keys(ACTION_COLORS).map(a => <Select.Option key={a} value={a}>{a}</Select.Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={10}>
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
                <Table columns={columns} dataSource={logs} rowKey="id" loading={loading}
                    scroll={{ x: 900 }} size="small"
                    pagination={{
                        pageSize: 50, total, showTotal: t => `Tổng ${t} logs`,
                        onChange: (page, size) => fetch(page, size)
                    }}
                />
            </Card>
        </div>
    );
}
