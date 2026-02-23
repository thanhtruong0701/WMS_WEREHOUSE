import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Alert, Spin, Badge } from 'antd';
import {
    AppstoreOutlined, GoldOutlined, AlertOutlined, WarningOutlined,
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardAPI } from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const KPI_CARDS = (stats) => [
    {
        title: 'Tổng Nguyên Vật Liệu',
        value: stats.totalMaterials,
        suffix: 'loại',
        icon: <AppstoreOutlined style={{ fontSize: 32, color: '#1E3A5F' }} />,
        bg: 'linear-gradient(135deg, #e8f0fa, #c8dbf5)',
        color: '#1E3A5F',
    },
    {
        title: 'Tổng Thành Phẩm (FG)',
        value: stats.totalFGProducts,
        suffix: 'SKU',
        icon: <GoldOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
        bg: 'linear-gradient(135deg, #e8f9e8, #b8edb8)',
        color: '#52c41a',
    },
    {
        title: 'Tồn Kho Material',
        value: stats.totalMaterialStock,
        suffix: '',
        precision: 0,
        icon: <AppstoreOutlined style={{ fontSize: 32, color: '#2E6BA8' }} />,
        bg: 'linear-gradient(135deg, #e0f0ff, #b0d8ff)',
        color: '#2E6BA8',
    },
    {
        title: 'Tồn Kho FG',
        value: stats.totalFGStock,
        suffix: 'PCS',
        precision: 0,
        icon: <GoldOutlined style={{ fontSize: 32, color: '#faad14' }} />,
        bg: 'linear-gradient(135deg, #fff8e0, #ffe8a0)',
        color: '#faad14',
    },
];

const LOW_STOCK_COLS_MAT = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Tồn', dataIndex: 'current_stock', key: 'current_stock', render: v => <Text type="danger" strong>{Number(v).toFixed(0)}</Text> },
    { title: 'Ngưỡng', dataIndex: 'low_stock_threshold', key: 'low_stock_threshold' },
];

const RECENT_COLS = [
    {
        title: 'Loại', dataIndex: 'category', key: 'category',
        render: v => <Tag color={v === 'material' ? 'blue' : v === 'fg_production' ? 'green' : 'orange'}>{v === 'material' ? 'Vật Liệu' : v === 'fg_production' ? 'SX Nhập' : 'Xuất Kho'}</Tag>
    },
    { title: 'Mã SP', dataIndex: 'item_code', key: 'item_code', width: 120 },
    { title: 'Tên', dataIndex: 'item_name', key: 'item_name' },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', render: v => Number(v).toLocaleString() },
    { title: 'Ngày', dataIndex: 'transaction_date', key: 'transaction_date', render: v => dayjs(v).format('DD/MM/YYYY') },
    {
        title: 'Trạng thái', dataIndex: 'status', key: 'status',
        render: v => <Badge status={v === 'confirmed' ? 'success' : 'processing'} text={v === 'confirmed' ? 'Đã xác nhận' : 'Nháp'} />
    },
];

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardAPI.getStats().then(res => setData(res.data.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-loading"><Spin size="large" /></div>;
    if (!data) return null;

    const chartData = data.monthlyMaterialTx.map(m => ({
        month: m.month,
        'Nhập VL': Number(m.total_in).toFixed(0),
        'Xuất VL': Number(m.total_out).toFixed(0),
    }));

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>📊 Dashboard Tổng Quan</Title>
                <Text type="secondary">Cập nhật: {dayjs().format('DD/MM/YYYY HH:mm')}</Text>
            </div>

            {/* Alerts */}
            {(data.summary.lowStockMaterialCount > 0 || data.summary.lowStockFGCount > 0) && (
                <Alert
                    message={`⚠️ Cảnh báo: ${data.summary.lowStockMaterialCount} vật liệu và ${data.summary.lowStockFGCount} thành phẩm sắp hết hàng!`}
                    type="warning" showIcon
                    style={{ marginBottom: 16, borderRadius: 10, borderLeft: '4px solid #faad14' }}
                />
            )}

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {KPI_CARDS(data.summary).map((card, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <Card className="stat-card" bodyStyle={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>{card.title}</Text>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1.2, marginTop: 4 }}>
                                        {Number(card.value || 0).toLocaleString()}
                                        {card.suffix && <span style={{ fontSize: 14, marginLeft: 4, fontWeight: 500 }}>{card.suffix}</span>}
                                    </div>
                                </div>
                                <div style={{
                                    width: 60, height: 60, borderRadius: 16, background: card.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {card.icon}
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Chart + Low Stock */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={14}>
                    <Card title="📈 Nhập/Xuất Nguyên Vật Liệu (6 tháng)" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <ReTooltip />
                                <Legend />
                                <Bar dataKey="Nhập VL" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Xuất VL" fill="#2E6BA8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card title={<span>⚠️ <Text type="warning">Sắp hết vật liệu</Text></span>}
                        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: '100%' }}>
                        <Table
                            dataSource={data.lowStockMaterials}
                            columns={LOW_STOCK_COLS_MAT}
                            rowKey="code"
                            pagination={false}
                            size="small"
                            scroll={{ y: 220 }}
                            locale={{ emptyText: '✅ Không có vật liệu sắp hết' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Recent Transactions */}
            <Card title="🔄 Giao Dịch Gần Đây" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Table
                    dataSource={data.recentTransactions}
                    columns={RECENT_COLS}
                    rowKey={(r, i) => i}
                    pagination={false}
                    size="small"
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'Chưa có giao dịch nào' }}
                />
            </Card>
        </div>
    );
}
