import { Form, Input, Button, Card, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { appConfig } from '@pawroute/config';

const { Title, Text } = Typography;
const c = appConfig.brand.colors;

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{ width: '100%', maxWidth: 400, borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🐾</div>
          <Title level={3} style={{ color: c.primary, margin: 0 }}>{appConfig.product.name}</Title>
          <Text type="secondary">Admin Portal</Text>
        </div>

        <Form layout="vertical" size="large">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined style={{ color: c.secondary }} />} placeholder="admin@pawroute.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined style={{ color: c.secondary }} />} placeholder="Password" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            style={{
              height: 48,
              background: c.primary,
              borderColor: c.primary,
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            Sign In
          </Button>
        </Form>
      </Card>
    </div>
  );
}
