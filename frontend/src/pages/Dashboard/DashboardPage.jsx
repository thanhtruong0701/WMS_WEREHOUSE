import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Table, Tag, Alert, Spin, Badge, Button } from 'antd';
import {
    AppstoreOutlined, GoldOutlined, AlertOutlined, SwapOutlined,
} from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
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
        title: 'Thành Phẩm (FG)',
        value: stats.totalFGProducts,
        suffix: 'SKU',
        icon: <GoldOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
        bg: 'linear-gradient(135deg, #e8f9e8, #b8edb8)',
        color: '#52c41a',
    },
    {
        title: 'Tỷ lệ Xuất/Nhập',
        value: stats.ratioInVsOut,
        suffix: '%',
        precision: 1,
        icon: <SwapOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
        bg: 'linear-gradient(135deg, #e6f7ff, #bae7ff)',
        color: '#1890ff',
    },
    {
        title: 'Cảnh báo tồn kho',
        value: stats.lowStockMaterialCount + stats.lowStockFGCount,
        suffix: 'mặt hàng',
        icon: <AlertOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />,
        bg: 'linear-gradient(135deg, #fff1f0, #ffccc7)',
        color: '#ff4d4f',
    },
];

const LOW_STOCK_COLS_MAT = [
    { title: 'Mã', dataIndex: 'code', key: 'code', width: 90 },
    { title: 'Tên', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Tồn', dataIndex: 'current_stock', key: 'current_stock', width: 70, render: v => <Text type="danger" strong>{Number(v).toFixed(0)}</Text> },
];

const RECENT_COLS = [
    {
        title: 'Loại', dataIndex: 'type', key: 'type',
        render: (v, r) => {
            const isMaterial = v === 'material';
            const isIn = r.sub_type === 'in' || v === 'production';
            return <Tag color={isIn ? 'green' : 'orange'}>{isMaterial ? (isIn ? 'Nhập VL' : 'Xuất VL') : 'SX Nhập'}</Tag>;
        }
    },
    { title: 'Mã', dataIndex: 'item_code', key: 'item_code', width: 100 },
    { title: 'Tên mặt hàng', dataIndex: 'item_name', key: 'item_name', ellipsis: true },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 80, render: v => Number(v).toLocaleString() },
    { title: 'Ngày', dataIndex: 'transaction_date', key: 'transaction_date', width: 100, render: v => dayjs(v).format('DD/MM') },
];

export default function DashboardPage() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardAPI.getStats().then(res => setData(res.data.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-loading"><Spin size="large" /></div>;
    if (!data || !data.summary) return (
        <div style={{ padding: 40, textAlign: 'center' }}>
            <Alert message="Không có dữ liệu thống kê" type="info" showIcon />
        </div>
    );

    const chartData = (data.monthlyMaterialTx || []).map(m => ({
        month: m.month,
        'Nhập VL': Number(m.total_in || 0),
        'Xuất VL': Number(m.total_out || 0),
    }));

    const ratioData = [
        { name: 'Đã Xuất', value: Number(data.summary.ratioInVsOut || 0) },
        { name: 'Còn Tồn', value: Math.max(0, 100 - Number(data.summary.ratioInVsOut || 0)) },
    ];

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>📊 Dashboard Tổng Quan</Title>
                <Text type="secondary">Phân tích hiệu quả xuất nhập kho</Text>
            </div>

            {/* Alerts */}
            {data.summary.pendingTxCount > 0 && (
                <Alert
                    message={`Bạn có ${data.summary.pendingTxCount} phiếu giao dịch đang ở trạng thái Nháp. Vui lòng xác nhận để dữ liệu được cập nhật vào báo cáo.`}
                    type="info" showIcon
                    action={
                        <Button size="small" type="primary" onClick={() => navigate('/transactions')}>
                            Xác nhận ngay
                        </Button>
                    }
                    style={{ marginBottom: 16, borderRadius: 10 }}
                />
            )}
            {(data.summary.lowStockMaterialCount > 0 || data.summary.lowStockFGCount > 0) && (
                <Alert
                    message={`Hệ thống ghi nhận ${data.summary.lowStockMaterialCount} vật liệu và ${data.summary.lowStockFGCount} thành phẩm sắp hết hàng.`}
                    type="warning" showIcon closable
                    style={{ marginBottom: 16, borderRadius: 10 }}
                />
            )}

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {KPI_CARDS(data.summary).map((card, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <Card className="stat-card" bodyStyle={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <Text type="secondary" style={{ fontSize: 13 }}>{card.title}</Text>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: card.color, marginTop: 4 }}>
                                        {Number(card.value || 0).toLocaleString()}
                                        {card.suffix && <span style={{ fontSize: 14, marginLeft: 4 }}>{card.suffix}</span>}
                                    </div>
                                </div>
                                <div style={{
                                    width: 50, height: 50, borderRadius: 12, background: card.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {card.icon}
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Advanced Analytics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={16}>
                    <Card title="📈 Xu hướng Xuất Nhập 12 tháng" style={{ borderRadius: 12 }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <ReTooltip cursor={{ fill: '#f5f5f5' }} />
                                <Legend verticalAlign="top" align="right" iconType="circle" />
                                <Bar dataKey="Nhập VL" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Xuất VL" fill="#52c41a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="🎯 Tỷ lệ Xuất / Nhập" style={{ borderRadius: 12, height: '100%', textAlign: 'center' }}>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={ratioData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <Cell fill="#52c41a" />
                                    <Cell fill="#f0f2f5" />
                                </Pie>
                                <ReTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: -140, marginBottom: 100 }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{data.summary.ratioInVsOut}%</div>
                            <Text type="secondary">Hiệu suất luân chuyển</Text>
                        </div>
                        <Alert
                            message={data.summary.ratioInVsOut > 80 ? "🔥 Tốc độ luân chuyển hàng rất nhanh" : "⚓ Hàng tồn kho đang ổn định"}
                            type="info"
                            style={{ textAlign: 'left', fontSize: 12 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <Card title="🔄 Giao dịch gần nhất" style={{ borderRadius: 12 }}>
                        <Table
                            dataSource={data.recentTransactions}
                            columns={RECENT_COLS}
                            rowKey={(r, i) => i}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card title="🔥 Vật tư dùng nhiều (30 ngày)" style={{ borderRadius: 12 }}>
                        <Table
                            dataSource={data.topUsageMaterials}
                            columns={[
                                { title: 'Mã', dataIndex: 'code', key: 'code', width: 100 },
                                { title: 'Tên vật tư', dataIndex: 'name', key: 'name' },
                                { title: 'Tổng xuất', dataIndex: 'total_usage', key: 'total_usage', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()}</Text> },
                            ]}
                            rowKey="code"
                            pagination={false}
                            size="small"
                        />
                        <div style={{ marginTop: 16 }}>
                            <Badge status="warning" text="Cần lưu ý đặt hàng sớm cho nhóm này" />
                        </div>
                    </Card>
                    <Card title="⚠️ Sắp hết hàng" style={{ borderRadius: 12, marginTop: 16 }}>
                        <Table
                            dataSource={data.lowStockMaterials}
                            columns={LOW_STOCK_COLS_MAT}
                            rowKey="code"
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
