/**
 * @file PaymentsPage.tsx
 * @description Admin payments & revenue reports page.
 */

import { useEffect, useState } from 'react';
import {
  Table, Select, Tag, Button, Space, Modal, Typography,
  Statistic, Row, Col, Card, Popconfirm, message,
} from 'antd';
import { DollarOutlined, CreditCardOutlined } from '@ant-design/icons';
import { api } from '../lib/api';

const { Title, Text } = Typography;

type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
type PaymentMethod = 'STRIPE' | 'CASH';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayRef?: string;
  refundedAmount: number;
  paidAt?: string;
  createdAt: string;
  appointment?: {
    bookingRef: string;
    user: { name: string; email: string };
    service: { name: string };
  };
}

const STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: 'gold',
  SUCCESS: 'green',
  FAILED: 'red',
  REFUNDED: 'purple',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [methodFilter, setMethodFilter] = useState<string | undefined>();
  const [stats, setStats] = useState({ revenue: 0, count: 0 });
  const [refundModal, setRefundModal] = useState<Payment | null>(null);
  const [refunding, setRefunding] = useState(false);

  const fetchPayments = async (p = page) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const { data } = await api.get('/admin/payments', { params });
      setPayments(data.data.payments);
      setTotal(data.data.total);
      const rev = data.data.payments
        .filter((x: Payment) => x.status === 'SUCCESS')
        .reduce((sum: number, x: Payment) => sum + x.amount - x.refundedAmount, 0);
      const cnt = data.data.payments.filter((x: Payment) => x.status === 'SUCCESS').length;
      setStats({ revenue: rev, count: cnt });
    } catch {
      message.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(1); }, [statusFilter, methodFilter]);

  const handleRefund = async () => {
    if (!refundModal) return;
    setRefunding(true);
    try {
      await api.post(`/payments/admin/refund/${refundModal.id}`);
      message.success('Refund initiated');
      setRefundModal(null);
      fetchPayments();
    } catch (err: any) {
      message.error(err.response?.data?.error ?? 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  const columns = [
    {
      title: 'Booking Ref',
      dataIndex: ['appointment', 'bookingRef'],
      render: (ref: string) => <Text code>{ref ?? '—'}</Text>,
    },
    {
      title: 'Customer',
      render: (_: any, r: Payment) => (
        <div>
          <div className="font-medium">{r.appointment?.user.name ?? '—'}</div>
          <div className="text-xs text-gray-500">{r.appointment?.user.email}</div>
        </div>
      ),
    },
    {
      title: 'Service',
      dataIndex: ['appointment', 'service', 'name'],
      render: (v: string) => v ?? '—',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: number, r: Payment) => (
        <span>
          {r.currency} {v.toFixed(2)}
          {r.refundedAmount > 0 && (
            <div className="text-xs text-red-500">-{r.currency} {r.refundedAmount.toFixed(2)} refunded</div>
          )}
        </span>
      ),
    },
    {
      title: 'Method',
      dataIndex: 'method',
      render: (v: PaymentMethod) => (
        <Tag icon={v === 'STRIPE' ? <CreditCardOutlined /> : <DollarOutlined />}>
          {v === 'STRIPE' ? 'Card' : 'Cash'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v: PaymentStatus) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
      title: 'Paid At',
      dataIndex: 'paidAt',
      render: (v?: string) => v ? new Date(v).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    {
      title: 'Actions',
      render: (_: any, r: Payment) =>
        r.status === 'SUCCESS' && r.method === 'STRIPE' && r.refundedAmount === 0 ? (
          <Button size="small" danger onClick={() => setRefundModal(r)}>Refund</Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={3}>Payments & Revenue</Title>

      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card>
            <Statistic
              title="Successful Transactions"
              value={total}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Revenue (Filtered)"
              value={stats.revenue}
              precision={2}
              prefix="AED"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Paid Count (Filtered)"
              value={stats.count}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Space className="mb-4">
        <Select
          placeholder="Filter by status"
          allowClear
          style={{ width: 160 }}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={[
            { label: 'Pending', value: 'PENDING' },
            { label: 'Success', value: 'SUCCESS' },
            { label: 'Failed', value: 'FAILED' },
            { label: 'Refunded', value: 'REFUNDED' },
          ]}
        />
        <Select
          placeholder="Filter by method"
          allowClear
          style={{ width: 140 }}
          onChange={(v) => { setMethodFilter(v); setPage(1); }}
          options={[
            { label: 'Card (Stripe)', value: 'STRIPE' },
            { label: 'Cash', value: 'CASH' },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={payments}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p) => { setPage(p); fetchPayments(p); },
        }}
      />

      <Modal
        title="Issue Refund"
        open={!!refundModal}
        onOk={handleRefund}
        confirmLoading={refunding}
        onCancel={() => setRefundModal(null)}
        okText="Confirm Refund"
        okButtonProps={{ danger: true }}
      >
        {refundModal && (
          <div>
            <p>Issue a full refund for booking <Text code>{refundModal.appointment?.bookingRef}</Text>?</p>
            <p>Amount: <strong>AED {refundModal.amount.toFixed(2)}</strong></p>
            <p className="text-gray-500 text-sm">This will trigger a Stripe refund and update the payment status.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
