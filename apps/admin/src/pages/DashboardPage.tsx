import { Card, Col, Row, Statistic, Typography } from 'antd';
import {
  CalendarOutlined, DollarOutlined, TeamOutlined,
  ClockCircleOutlined, RiseOutlined,
} from '@ant-design/icons';
import { appConfig } from '@pawroute/config';
import { formatCurrency } from '@pawroute/utils';

const { Title, Text } = Typography;
const c = appConfig.brand.colors;

const kpiCards = [
  {
    title: 'Total Bookings',
    value: 0,
    suffix: '',
    prefix: <CalendarOutlined style={{ color: c.secondary }} />,
    color: c.secondary,
  },
  {
    title: "Today's Appointments",
    value: 0,
    suffix: '',
    prefix: <ClockCircleOutlined style={{ color: c.accent }} />,
    color: c.accent,
  },
  {
    title: 'Total Revenue',
    value: 0,
    suffix: '',
    prefix: <DollarOutlined style={{ color: c.success }} />,
    color: c.success,
    formatter: (v: number) => formatCurrency(v),
  },
  {
    title: 'Active Customers',
    value: 0,
    suffix: '',
    prefix: <TeamOutlined style={{ color: c.pink }} />,
    color: c.pink,
  },
  {
    title: 'Pending',
    value: 0,
    suffix: '',
    prefix: <RiseOutlined style={{ color: c.warning }} />,
    color: c.warning,
  },
];

export default function DashboardPage() {
  return (
    <div style={{ padding: '0 0 24px' }}>
      <Title level={4} style={{ marginBottom: 20, color: c.textPrimary }}>
        Dashboard
      </Title>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        {kpiCards.map((kpi) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={kpi.title} style={{ flex: '1 1 180px' }}>
            <Card
              bordered={false}
              style={{ borderTop: `3px solid ${kpi.color}`, borderRadius: 16 }}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 13 }}>{kpi.title}</Text>}
                value={kpi.value}
                prefix={kpi.prefix}
                formatter={kpi.formatter as any}
                valueStyle={{ fontSize: 28, fontWeight: 700, color: c.textPrimary }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Revenue (This Month)" bordered={false} style={{ borderRadius: 16 }}>
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.textSecondary,
              }}
            >
              Revenue chart — implemented in Phase 7
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Booking Status" bordered={false} style={{ borderRadius: 16 }}>
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.textSecondary,
              }}
            >
              Status pie chart — Phase 7
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
