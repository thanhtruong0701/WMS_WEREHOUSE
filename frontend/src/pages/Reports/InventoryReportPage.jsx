import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, DatePicker, Select, Typography, Space, message, Divider } from 'antd';
import { FileExcelOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { warehousesAPI, excelAPI } from '../../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function InventoryReportPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [params, setParams] = useState({
        dateRange: [dayjs().startOf('month'), dayjs()],
        warehouse_id: null,
    });

    useEffect(() => {
        warehousesAPI.list().then(res => setWarehouses(res.data.data));
    }, []);

    const handleDownload = async (type) => {
        setLoading(true);
        try {
            const date_from = params.dateRange?.[0]?.format('YYYY-MM-DD');
            const date_to = params.dateRange?.[1]?.format('YYYY-MM-DD');
            const query = { date_from, date_to, warehouse_id: params.warehouse_id };

            const res = type === 'material'
                ? await excelAPI.exportMaterial(query)
                : await excelAPI.exportFG(query);

            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `IOS_${type === 'material' ? 'Material' : 'FG'}_${dayjs().format('YYYYMMDD')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            message.success('Tải báo cáo thành công');
        } catch (e) {
            message.error('Lỗi khi tải báo cáo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <Title level={2} style={{ margin: 0, color: '#1E3A5F' }}>📄 Báo Cáo Xuất Nhập Tồn</Title>
                <Text type="secondary">Tạo và xuất báo cáo tồn kho chuyên nghiệp (Excel)</Text>
            </div>

            <Card style={{ borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Row gutter={[24, 16]} align="bottom">
                    <Col xs={24} md={10}>
                        <div style={{ marginBottom: 8 }}><Text strong>Khoảng thời gian:</Text></div>
                        <RangePicker
                            style={{ width: '100%' }}
                            value={params.dateRange}
                            onChange={(val) => setParams(p => ({ ...p, dateRange: val }))}
                            format="DD/MM/YYYY"
                        />
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ marginBottom: 8 }}><Text strong>Chọn Kho:</Text></div>
                        <Select
                            placeholder="Tất cả các kho"
                            style={{ width: '100%' }}
                            allowClear
                            onChange={(val) => setParams(p => ({ ...p, warehouse_id: val }))}
                        >
                            {warehouses.map(w => (
                                <Select.Option key={w.id} value={w.id}>{w.name} ({w.type})</Select.Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Button
                            block
                            icon={<SearchOutlined />}
                            onClick={() => message.info('Tính năng xem trước đang phát triển')}
                        >
                            Xem trước (Coming)
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                    <Card
                        hoverable
                        className="report-card"
                        style={{ borderLeft: '6px solid #1E3A5F', borderRadius: 12 }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                    padding: 12, background: '#e6f7ff', borderRadius: 12, marginRight: 16
                                }}>
                                    <FileExcelOutlined style={{ fontSize: 32, color: '#1E3A5F' }} />
                                </div>
                                <Title level={4} style={{ margin: 0 }}>Báo cáo Nguyên Vật Liệu</Title>
                            </div>
                            <Text type="secondary">
                                Chi tiết Nhập - Xuất - Tồn đầu kỳ và cuối kỳ cho tất cả các loại vải, phụ kiện.
                            </Text>
                            <Divider style={{ margin: '8px 0' }} />
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                block
                                size="large"
                                loading={loading}
                                onClick={() => handleDownload('material')}
                            >
                                Xuất Báo Cáo Material
                            </Button>
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card
                        hoverable
                        className="report-card"
                        style={{ borderLeft: '6px solid #52c41a', borderRadius: 12 }}
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                    padding: 12, background: '#f6ffed', borderRadius: 12, marginRight: 16
                                }}>
                                    <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                                </div>
                                <Title level={4} style={{ margin: 0 }}>Báo cáo Thành Phẩm (FG)</Title>
                            </div>
                            <Text type="secondary">
                                Phân tích sản lượng Sản xuất vs Giao hàng theo từng SKU, kích cỡ và màu sắc.
                            </Text>
                            <Divider style={{ margin: '8px 0' }} />
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                block
                                size="large"
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                loading={loading}
                                onClick={() => handleDownload('fg')}
                            >
                                Xuất Báo Cáo FG
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
