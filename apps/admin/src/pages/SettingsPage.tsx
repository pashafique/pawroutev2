/**
 * @file SettingsPage.tsx
 * @description Admin business settings management — contact, booking rules, finance.
 */

import { useEffect, useState } from 'react';
import {
  Form, Input, InputNumber, Switch, Button, Card, Typography,
  Tabs, message, Spin, Row, Col,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { api } from '../lib/api';

const { Title } = Typography;

interface BusinessSettings {
  businessName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  country: string;
  mapLat?: number;
  mapLng?: number;
  cancellationWindowHours: number;
  slotHoldMinutes: number;
  maxAdvanceBookingDays: number;
  vatEnabled: boolean;
  vatRate: number;
  vatNumber: string;
  currency: string;
  timezone: string;
}

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => form.setFieldsValue(data.data))
      .catch(() => message.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.patch('/admin/settings', values);
      message.success('Settings saved');
    } catch (err: any) {
      if (err?.response) message.error(err.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spin size="large" /></div>;

  const tabItems = [
    {
      key: 'contact',
      label: 'Business Info',
      children: (
        <Card>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="businessName" label="Business Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Contact Email">
                <Input type="email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="whatsappNumber" label="WhatsApp Number">
                <Input placeholder="+971XXXXXXXXX" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="address" label="Address">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="country" label="Country">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mapLat" label="Map Latitude">
                <InputNumber style={{ width: '100%' }} step={0.0001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mapLng" label="Map Longitude">
                <InputNumber style={{ width: '100%' }} step={0.0001} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ),
    },
    {
      key: 'booking',
      label: 'Booking Rules',
      children: (
        <Card>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="cancellationWindowHours"
                label="Cancellation Window (hours)"
                tooltip="Customers cannot cancel within this window before the appointment."
              >
                <InputNumber min={0} max={72} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="slotHoldMinutes"
                label="Slot Hold Duration (minutes)"
                tooltip="How long a slot is locked while the customer completes payment."
              >
                <InputNumber min={1} max={60} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxAdvanceBookingDays"
                label="Max Advance Booking (days)"
                tooltip="How many days ahead customers can book."
              >
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ),
    },
    {
      key: 'finance',
      label: 'Finance & Tax',
      children: (
        <Card>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="currency" label="Currency Code">
                <Input placeholder="AED" maxLength={3} style={{ textTransform: 'uppercase' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="timezone" label="Timezone">
                <Input placeholder="Asia/Dubai" />
              </Form.Item>
            </Col>
            <Col span={24} className="mt-2">
              <Form.Item name="vatEnabled" label="VAT Enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vatRate" label="VAT Rate (%)">
                <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="vatNumber" label="VAT Registration Number">
                <Input placeholder="TRN XXXXXXXXXXXXXXX" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} style={{ margin: 0 }}>Business Settings</Title>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
          size="large"
        >
          Save Changes
        </Button>
      </div>

      <Form form={form} layout="vertical">
        <Tabs items={tabItems} />
      </Form>
    </div>
  );
}
