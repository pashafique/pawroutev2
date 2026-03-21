/**
 * @file CouponsPage.tsx
 * @description Admin coupon management — CRUD, usage stats.
 */

import { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Modal, Form, Input, Select,
  InputNumber, DatePicker, Switch, Space, Typography, message, Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../lib/api';

const { Title, Text } = Typography;

interface Coupon {
  id: string;
  code: string;
  discountType: 'FLAT' | 'PERCENTAGE';
  discountValue: number;
  minOrderValue?: number;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount: number;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchCoupons = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/coupons', { params: { page: p, pageSize: 20 } });
      setCoupons(data.data.coupons);
      setTotal(data.data.total);
    } catch {
      message.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(1); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, discountType: 'FLAT' });
    setModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    form.setFieldsValue({
      ...c,
      validFrom: dayjs(c.validFrom),
      validUntil: c.validUntil ? dayjs(c.validUntil) : undefined,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        validFrom: values.validFrom?.toISOString(),
        validUntil: values.validUntil?.toISOString() ?? null,
      };
      if (editing) {
        await api.patch(`/coupons/${editing.id}`, payload);
        message.success('Coupon updated');
      } else {
        await api.post('/coupons', payload);
        message.success('Coupon created');
      }
      setModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      if (err?.response) message.error(err.response?.data?.error ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/coupons/${id}`);
      message.success('Coupon deleted');
      fetchCoupons();
    } catch {
      message.error('Delete failed');
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await api.patch(`/coupons/${c.id}`, { isActive: !c.isActive });
      fetchCoupons();
    } catch {
      message.error('Update failed');
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: 'Discount',
      render: (_: any, r: Coupon) =>
        r.discountType === 'FLAT'
          ? `AED ${r.discountValue}`
          : `${r.discountValue}%`,
    },
    {
      title: 'Min Order',
      dataIndex: 'minOrderValue',
      render: (v?: number) => v ? `AED ${v}` : '—',
    },
    {
      title: 'Usage',
      render: (_: any, r: Coupon) => (
        <span>
          {r.usedCount}
          {r.usageLimit ? ` / ${r.usageLimit}` : ' / ∞'}
        </span>
      ),
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      render: (v?: string) => v ? dayjs(v).format('DD MMM YYYY') : 'No expiry',
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      render: (v: boolean, r: Coupon) => (
        <Switch checked={v} onChange={() => toggleActive(r)} size="small" />
      ),
    },
    {
      title: 'Actions',
      render: (_: any, r: Coupon) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm title="Delete this coupon?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={3} style={{ margin: 0 }}>Coupons & Offers</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Create Coupon
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={coupons}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: (p) => { setPage(p); fetchCoupons(p); },
        }}
      />

      <Modal
        title={editing ? 'Edit Coupon' : 'Create Coupon'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setModalOpen(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Coupon Code" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g. SAVE20" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Space style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="discountType" label="Type" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ label: 'Flat (AED)', value: 'FLAT' }, { label: 'Percentage (%)', value: 'PERCENTAGE' }]} />
            </Form.Item>
            <Form.Item name="discountValue" label="Value" rules={[{ required: true, message: 'Required' }]} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="minOrderValue" label="Min Order (AED)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="usageLimit" label="Total Uses Limit" style={{ flex: 1 }}>
              <InputNumber min={1} placeholder="Unlimited" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="perUserLimit" label="Per User Limit" style={{ flex: 1 }}>
              <InputNumber min={1} placeholder="Unlimited" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="validFrom" label="Valid From" rules={[{ required: true, message: 'Required' }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="validUntil" label="Valid Until (optional)" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
