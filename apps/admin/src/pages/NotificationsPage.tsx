/**
 * @file NotificationsPage.tsx
 * @description Admin broadcast notifications composer.
 */

import { useState } from 'react';
import {
  Card, Form, Input, Select, Button, Typography, Alert, message,
} from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { api } from '../lib/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface BroadcastResult {
  sent: number;
  failed: number;
}

export default function NotificationsPage() {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      setSending(true);
      setResult(null);
      const { data } = await api.post('/notifications/admin/broadcast', values);
      setResult(data.data);
      message.success(`Broadcast sent to ${data.data.sent} devices`);
      form.resetFields();
      form.setFieldsValue({ segment: 'ALL' });
    } catch (err: any) {
      if (err?.response) {
        message.error(err.response?.data?.error ?? 'Broadcast failed');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <Title level={3}>Push Notifications</Title>

      <div style={{ maxWidth: 600 }}>
        <Card title="Broadcast to Customers" className="mb-6">
          <Paragraph type="secondary">
            Send a push notification to all or active app users. Notifications are delivered via Firebase Cloud Messaging.
          </Paragraph>

          <Form form={form} layout="vertical" initialValues={{ segment: 'ALL' }}>
            <Form.Item
              name="segment"
              label="Audience"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'All Users', value: 'ALL' },
                  { label: 'Active Users Only', value: 'ACTIVE' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="title"
              label="Notification Title"
              rules={[{ required: true, message: 'Title is required' }, { max: 65 }]}
            >
              <Input placeholder="e.g. 🎉 Special Offer!" showCount maxLength={65} />
            </Form.Item>

            <Form.Item
              name="body"
              label="Message Body"
              rules={[{ required: true, message: 'Message is required' }, { max: 200 }]}
            >
              <TextArea
                rows={4}
                placeholder="e.g. Book today and get 20% off your next grooming session!"
                showCount
                maxLength={200}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
                size="large"
              >
                Send Broadcast
              </Button>
            </Form.Item>
          </Form>

          {result && (
            <Alert
              type="success"
              message={
                <span>
                  Broadcast complete — <Text strong>{result.sent}</Text> delivered,{' '}
                  <Text type="warning">{result.failed}</Text> failed.
                </span>
              }
              showIcon
            />
          )}
        </Card>

        <Card title="Tips for Effective Notifications">
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>Keep titles under 50 characters for full display on all devices.</li>
            <li>Personalised messages have higher open rates — consider segmenting by booking history.</li>
            <li>Avoid sending more than 2 broadcasts per week to prevent opt-outs.</li>
            <li>Use emojis sparingly in the title to grab attention.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
